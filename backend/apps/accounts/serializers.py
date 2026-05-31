from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import APIKey

User = get_user_model()


REFERRAL_BONUS = 1_000  # credits awarded to both referrer and referee


class RegisterSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)
    referral_code    = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model  = User
        fields = ('email', 'full_name', 'password', 'confirm_password', 'referral_code')

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        ref_code = validated_data.pop('referral_code', '').strip().upper()
        user = User.objects.create_user(
            email     = validated_data['email'],
            full_name = validated_data.get('full_name', ''),
            password  = validated_data['password'],
        )
        if ref_code:
            try:
                referrer = User.objects.get(referral_code=ref_code)
                if referrer.pk != user.pk:
                    user.referred_by = referrer
                    user.credits += REFERRAL_BONUS
                    user.save(update_fields=['referred_by', 'credits'])

                    referrer.credits += REFERRAL_BONUS
                    referrer.referral_credits_earned += REFERRAL_BONUS
                    referrer.save(update_fields=['credits', 'referral_credits_earned'])
            except User.DoesNotExist:
                pass  # invalid code — silently ignore
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = (
            'id', 'email', 'full_name', 'plan', 'credits',
            'timezone', 'email_verified',
            'notify_low_credits', 'notify_job_complete', 'notify_blacklist',
            'date_joined',
        )
        read_only_fields = ('id', 'email', 'plan', 'credits', 'email_verified', 'date_joined')


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ('full_name', 'timezone', 'notify_low_credits', 'notify_job_complete', 'notify_blacklist',
                  'webhook_url', 'webhook_secret')


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password     = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds user data to the token response."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class APIKeySerializer(serializers.ModelSerializer):
    raw_key = serializers.CharField(read_only=True)  # returned only on creation

    class Meta:
        model  = APIKey
        fields = ('id', 'name', 'prefix', 'is_active', 'created_at', 'last_used_at', 'requests_count', 'raw_key')
        read_only_fields = ('id', 'prefix', 'is_active', 'created_at', 'last_used_at', 'requests_count', 'raw_key')


class CreateAPIKeySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, default='Default')


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token        = serializers.CharField()
    uid          = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])
