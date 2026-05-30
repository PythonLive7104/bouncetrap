import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class Team(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name       = models.CharField(max_length=100)
    owner      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_teams')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'teams_team'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} (owner: {self.owner.email})'


class TeamMembership(models.Model):
    ROLE_ADMIN  = 'admin'
    ROLE_MEMBER = 'member'
    ROLE_VIEWER = 'viewer'

    ROLE_CHOICES = [
        (ROLE_ADMIN,  'Admin'),
        (ROLE_MEMBER, 'Member'),
        (ROLE_VIEWER, 'Viewer'),
    ]

    team        = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='memberships')
    user        = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='team_memberships')
    role        = models.CharField(max_length=10, choices=ROLE_CHOICES, default=ROLE_MEMBER)
    invited_by  = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='sent_invites')
    joined_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'teams_membership'
        unique_together = [('team', 'user')]

    def __str__(self):
        return f'{self.user.email} in {self.team.name} [{self.role}]'


class TeamInvite(models.Model):
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    team        = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='invites')
    email       = models.EmailField()
    role        = models.CharField(max_length=10, choices=TeamMembership.ROLE_CHOICES, default=TeamMembership.ROLE_MEMBER)
    token       = models.CharField(max_length=64, unique=True, db_index=True)
    invited_by  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='team_invites_sent')
    accepted    = models.BooleanField(default=False)
    expires_at  = models.DateTimeField()
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'teams_invite'
        ordering = ['-created_at']

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f'Invite {self.email} → {self.team.name} [{self.role}]'
