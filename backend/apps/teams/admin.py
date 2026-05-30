from django.contrib import admin
from .models import Team, TeamMembership, TeamInvite


class TeamMembershipInline(admin.TabularInline):
    model           = TeamMembership
    extra           = 0
    fields          = ('user', 'role', 'joined_at')
    readonly_fields = ('joined_at',)


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display    = ('name', 'owner', 'member_count', 'created_at')
    search_fields   = ('name', 'owner__email')
    readonly_fields = ('id', 'created_at')
    inlines         = [TeamMembershipInline]
    list_per_page   = 50

    @admin.display(description='Members')
    def member_count(self, obj):
        return obj.memberships.count()


@admin.register(TeamMembership)
class TeamMembershipAdmin(admin.ModelAdmin):
    list_display    = ('user', 'team', 'role', 'invited_by', 'joined_at')
    list_filter     = ('role',)
    search_fields   = ('user__email', 'team__name')
    readonly_fields = ('joined_at',)


@admin.register(TeamInvite)
class TeamInviteAdmin(admin.ModelAdmin):
    list_display    = ('email', 'team', 'role', 'invited_by', 'accepted', 'expires_at', 'created_at')
    list_filter     = ('accepted', 'role')
    search_fields   = ('email', 'team__name', 'token')
    readonly_fields = ('id', 'token', 'created_at')
