"""
Teams & Sub-accounts views.
Roles: admin — full control; member — can use team resources; viewer — read only.
Requires Growth+ plan to create a team.
"""
import secrets
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Team, TeamMembership, TeamInvite


INVITE_EXPIRY_DAYS = 7


def _serialize_team(team, user):
    membership = TeamMembership.objects.filter(team=team, user=user).first()
    members    = TeamMembership.objects.filter(team=team).select_related('user')
    return {
        'id':          str(team.id),
        'name':        team.name,
        'is_owner':    team.owner_id == user.pk,
        'my_role':     membership.role if membership else ('admin' if team.owner_id == user.pk else None),
        'member_count': members.count(),
        'members': [
            {
                'id':        str(m.user.pk),
                'email':     m.user.email,
                'full_name': m.user.full_name,
                'role':      m.role,
                'joined_at': m.joined_at.isoformat(),
                'is_owner':  m.user_id == team.owner_id,
            }
            for m in members
        ],
        'created_at': team.created_at.isoformat(),
    }


class TeamListCreateView(APIView):
    """GET / POST /api/v1/teams/"""

    def get(self, request):
        owned  = list(Team.objects.filter(owner=request.user))
        member = list(Team.objects.filter(memberships__user=request.user).exclude(owner=request.user))
        teams  = owned + member
        return Response([_serialize_team(t, request.user) for t in teams])

    def post(self, request):
        if request.user.plan == 'free':
            return Response(
                {'detail': 'Teams require credits. Purchase credits to unlock.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        name = request.data.get('name', '').strip()
        if not name:
            return Response({'detail': 'name is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if Team.objects.filter(owner=request.user).count() >= 5:
            return Response({'detail': 'You can own up to 5 teams.'}, status=status.HTTP_400_BAD_REQUEST)

        team = Team.objects.create(owner=request.user, name=name)
        TeamMembership.objects.create(team=team, user=request.user, role=TeamMembership.ROLE_ADMIN)
        return Response(_serialize_team(team, request.user), status=status.HTTP_201_CREATED)


class TeamDetailView(APIView):
    """GET / PATCH / DELETE /api/v1/teams/{id}/"""

    def _get_team(self, request, pk):
        try:
            team = Team.objects.get(pk=pk)
        except Team.DoesNotExist:
            return None, Response(status=status.HTTP_404_NOT_FOUND)
        is_member = TeamMembership.objects.filter(team=team, user=request.user).exists()
        if not is_member and team.owner_id != request.user.pk:
            return None, Response(status=status.HTTP_404_NOT_FOUND)
        return team, None

    def get(self, request, pk):
        team, err = self._get_team(request, pk)
        if err: return err
        return Response(_serialize_team(team, request.user))

    def patch(self, request, pk):
        team, err = self._get_team(request, pk)
        if err: return err
        if team.owner_id != request.user.pk:
            return Response({'detail': 'Only the owner can rename the team.'}, status=status.HTTP_403_FORBIDDEN)
        name = request.data.get('name', '').strip()
        if name:
            team.name = name
            team.save(update_fields=['name'])
        return Response(_serialize_team(team, request.user))

    def delete(self, request, pk):
        team, err = self._get_team(request, pk)
        if err: return err
        if team.owner_id != request.user.pk:
            return Response({'detail': 'Only the owner can delete the team.'}, status=status.HTTP_403_FORBIDDEN)
        team.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TeamInviteView(APIView):
    """POST /api/v1/teams/{id}/invite/"""

    def post(self, request, pk):
        try:
            team = Team.objects.get(pk=pk)
        except Team.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        membership = TeamMembership.objects.filter(team=team, user=request.user, role=TeamMembership.ROLE_ADMIN).first()
        if not membership and team.owner_id != request.user.pk:
            return Response({'detail': 'Only admins can invite members.'}, status=status.HTTP_403_FORBIDDEN)

        email = request.data.get('email', '').strip().lower()
        role  = request.data.get('role', TeamMembership.ROLE_MEMBER)
        if role not in (TeamMembership.ROLE_ADMIN, TeamMembership.ROLE_MEMBER, TeamMembership.ROLE_VIEWER):
            return Response({'detail': 'Invalid role.'}, status=status.HTTP_400_BAD_REQUEST)
        if not email:
            return Response({'detail': 'email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        TeamInvite.objects.filter(team=team, email=email, accepted=False).delete()
        invite = TeamInvite.objects.create(
            team=team, email=email, role=role,
            token=secrets.token_urlsafe(32),
            invited_by=request.user,
            expires_at=timezone.now() + timedelta(days=INVITE_EXPIRY_DAYS),
        )
        return Response({
            'detail':       f'Invitation sent to {email}.',
            'invite_token': invite.token,
            'expires_at':   invite.expires_at.isoformat(),
        }, status=status.HTTP_201_CREATED)


class TeamAcceptInviteView(APIView):
    """POST /api/v1/teams/accept-invite/"""

    def post(self, request):
        token = request.data.get('token', '').strip()
        if not token:
            return Response({'detail': 'token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            invite = TeamInvite.objects.select_related('team').get(token=token, accepted=False)
        except TeamInvite.DoesNotExist:
            return Response({'detail': 'Invalid or already-used invite token.'}, status=status.HTTP_400_BAD_REQUEST)

        if invite.is_expired:
            return Response({'detail': 'This invite has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        if invite.email.lower() != request.user.email.lower():
            return Response({'detail': 'This invite was sent to a different email address.'}, status=status.HTTP_403_FORBIDDEN)

        TeamMembership.objects.update_or_create(
            team=invite.team, user=request.user,
            defaults={'role': invite.role, 'invited_by': invite.invited_by},
        )
        invite.accepted = True
        invite.save(update_fields=['accepted'])
        return Response({
            'detail': f'You have joined {invite.team.name} as {invite.role}.',
            'team':   _serialize_team(invite.team, request.user),
        })


class TeamMemberView(APIView):
    """PATCH / DELETE /api/v1/teams/{id}/members/{user_id}/"""

    def _require_admin(self, request, pk):
        try:
            team = Team.objects.get(pk=pk)
        except Team.DoesNotExist:
            return None, Response(status=status.HTTP_404_NOT_FOUND)
        if team.owner_id != request.user.pk:
            m = TeamMembership.objects.filter(team=team, user=request.user, role=TeamMembership.ROLE_ADMIN).first()
            if not m:
                return None, Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        return team, None

    def patch(self, request, pk, user_id):
        team, err = self._require_admin(request, pk)
        if err: return err
        new_role = request.data.get('role', '')
        if new_role not in (TeamMembership.ROLE_ADMIN, TeamMembership.ROLE_MEMBER, TeamMembership.ROLE_VIEWER):
            return Response({'detail': 'Invalid role.'}, status=status.HTTP_400_BAD_REQUEST)
        updated = TeamMembership.objects.filter(team=team, user_id=user_id).exclude(user=team.owner).update(role=new_role)
        if not updated:
            return Response({'detail': 'Member not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'detail': 'Role updated.'})

    def delete(self, request, pk, user_id):
        try:
            team = Team.objects.get(pk=pk)
        except Team.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # Admin/owner can remove; members can remove themselves
        if str(request.user.pk) != str(user_id) and team.owner_id != request.user.pk:
            m = TeamMembership.objects.filter(team=team, user=request.user, role=TeamMembership.ROLE_ADMIN).first()
            if not m:
                return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        if str(user_id) == str(team.owner_id):
            return Response({'detail': 'The owner cannot be removed.'}, status=status.HTTP_400_BAD_REQUEST)

        TeamMembership.objects.filter(team=team, user_id=user_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
