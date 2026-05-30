from rest_framework import serializers
from .models import BulkJob, VerificationResult


class SingleVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()


class VerificationResultSerializer(serializers.ModelSerializer):
    class Meta:
        model  = VerificationResult
        fields = (
            'id', 'email', 'status', 'sub_status', 'score',
            'is_disposable', 'is_role_based', 'is_catch_all', 'is_free_email',
            'mx_found', 'smtp_valid', 'mx_record', 'domain',
            'deep_check_used', 'created_at',
        )
        read_only_fields = fields


class BulkJobSerializer(serializers.ModelSerializer):
    progress_pct      = serializers.IntegerField(read_only=True)
    local_engine_pct  = serializers.IntegerField(read_only=True)

    class Meta:
        model  = BulkJob
        fields = (
            'id', 'filename', 'status',
            'total_count', 'processed_count', 'progress_pct',
            'valid_count', 'invalid_count', 'risky_count', 'unknown_count',
            'duplicate_count', 'credits_used', 'local_engine_pct',
            'health_grade', 'health_advice',
            'error_message', 'created_at', 'completed_at',
        )
        read_only_fields = fields


class BulkUploadSerializer(serializers.Serializer):
    file         = serializers.FileField()
    email_column = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate_file(self, value):
        allowed = ('.csv', '.txt')
        name = value.name.lower()
        if not any(name.endswith(ext) for ext in allowed):
            raise serializers.ValidationError('Only .csv and .txt files are accepted.')
        if value.size > 50 * 1024 * 1024:  # 50 MB (NFR)
            raise serializers.ValidationError('File exceeds the 50 MB size limit.')
        return value
