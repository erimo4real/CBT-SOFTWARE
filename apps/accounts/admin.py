from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth import get_user_model

User = get_user_model()


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    model = User
    list_display = ['email', 'first_name', 'last_name', 'role', 'email_verified', 'is_active', 'created_at']
    list_filter = ['role', 'is_active', 'email_verified', 'is_google_account']
    search_fields = ['email', 'first_name', 'last_name']
    ordering = ['-created_at']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'phone', 'date_of_birth', 'bio', 'avatar')}),
        ('Roles & Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'email_verified')}),
        ('Google', {'fields': ('is_google_account',)}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'role', 'password1', 'password2'),
        }),
    )

    readonly_fields = ['created_at', 'updated_at']
