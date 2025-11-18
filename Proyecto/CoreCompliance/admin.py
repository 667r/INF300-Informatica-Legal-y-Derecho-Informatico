from django.contrib import admin
from .models import ComplianceDomain, ControlRule, Answer, AnswerFile

# Configuración para mostrar las reglas de forma más amigable
class ControlRuleInline(admin.TabularInline):
    model = ControlRule
    extra = 1 # Mostrar 1 campo para agregar una nueva regla

@admin.register(ComplianceDomain)
class ComplianceDomainAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    inlines = [ControlRuleInline] # Permite agregar reglas DENTRO de un dominio

@admin.register(ControlRule)
class ControlRuleAdmin(admin.ModelAdmin):
    list_display = ('text', 'domain', 'reference', 'requires_name', 'requires_mail', 'requires_phone')
    list_filter = ('domain',)
    search_fields = ('text', 'reference')
    fields = ('domain', 'text', 'reference', 'suggested_action', 'requires_name', 'requires_mail', 'requires_phone', 'required_files')

class AnswerFileInline(admin.TabularInline):
    model = AnswerFile
    extra = 0

@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ('rule', 'user', 'status', 'last_updated')
    list_filter = ('status', 'user')
    search_fields = ('rule__text',)
    fields = ('rule', 'user', 'status', 'notes', 'name', 'email', 'phone', 'evidence', 'last_updated')
    readonly_fields = ('last_updated',)
    inlines = [AnswerFileInline]

@admin.register(AnswerFile)
class AnswerFileAdmin(admin.ModelAdmin):
    list_display = ('answer', 'file_type', 'file', 'uploaded_at')
    list_filter = ('file_type', 'uploaded_at')
    search_fields = ('answer__rule__text', 'file_type')