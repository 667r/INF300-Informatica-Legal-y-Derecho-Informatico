from django.contrib import admin
from .models import ComplianceDomain, ControlRule, Answer

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
    list_display = ('text', 'domain', 'reference')
    list_filter = ('domain',)
    search_fields = ('text', 'reference')

@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ('rule', 'user', 'status', 'last_updated')
    list_filter = ('status', 'user')
    search_fields = ('rule__text',)