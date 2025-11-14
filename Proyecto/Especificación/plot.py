import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, Rectangle
import numpy as np

# Configuración del estilo
plt.style.use('seaborn-v0_8-whitegrid')
fig, ax = plt.subplots(1, 1, figsize=(12, 8))

# Colores
colors = {
    'client': '#2E86AB',
    'frontend': '#A23B72',
    'backend': '#F18F01',
    'database': '#C73E1D',
    'storage': '#3E92CC',
    'white': '#FFFFFF'
}

# ===== CAPA CLIENTE =====
client_y = 6.5
ax.add_patch(FancyBboxPatch((0.5, client_y), 11, 0.8, 
                           boxstyle="round,pad=0.1", 
                           facecolor=colors['client'], 
                           alpha=0.8,
                           edgecolor='black',
                           linewidth=1))

ax.text(6, client_y + 0.75, 'Capa Cliente', ha='center', va='center', 
        fontsize=12, fontweight='bold', color='white')

# Dispositivos cliente
devices = [
    (2, client_y + 0.4, 'Navegador Web\n(Tenant A)', 'laptop'),
    (6, client_y + 0.4, 'Navegador Web\n(Tenant B)', 'laptop'),
    (10, client_y + 0.4, 'Navegador Web\n(Tenant C)', 'laptop')
]

for x, y, text, device_type in devices:
    ax.plot([x, x], [y, 5.91], 'k-', alpha=0.7, linewidth=2)
    ax.text(x, y, text, ha='center', va='center', fontsize=9, 
            bbox=dict(boxstyle="round,pad=0.3", facecolor='white', alpha=0.9))

# ===== CAPA FRONTEND =====
frontend_y = 5.0
ax.add_patch(FancyBboxPatch((1, frontend_y), 10, 0.8, 
                           boxstyle="round,pad=0.1", 
                           facecolor=colors['frontend'], 
                           alpha=0.8,
                           edgecolor='black',
                           linewidth=1))

ax.text(6, frontend_y + 0.75, 'Capa de Presentación (Frontend)', 
        ha='center', va='center', fontsize=12, fontweight='bold', color='white')

# Componentes frontend
frontend_components = [
    (3, frontend_y + 0.4, 'SPA React/Vue.js\nLoad Balancer'),
    (6, frontend_y + 0.4, 'Servidor Web\nNginx'),
    (9, frontend_y + 0.4, 'CDN\n(Assets Estáticos)')
]

for x, y, text in frontend_components:
    ax.text(x, y, text, ha='center', va='center', fontsize=8,
            bbox=dict(boxstyle="round,pad=0.2", facecolor='white', alpha=0.9))

# ===== CAPA BACKEND =====
backend_y = 3.5
ax.add_patch(FancyBboxPatch((1.5, backend_y), 9, 0.8, 
                           boxstyle="round,pad=0.1", 
                           facecolor=colors['backend'], 
                           alpha=0.8,
                           edgecolor='black',
                           linewidth=1))

ax.text(6, backend_y + 0.75, 'Capa Lógica (Backend) - API Django', 
        ha='center', va='center', fontsize=12, fontweight='bold', color='white')

# Componentes backend
backend_components = [
    (3, backend_y + 0.4, 'Motor de Cumplimiento\n(Gap Analysis)'),
    (6, backend_y + 0.4, 'API REST\nAutenticación'),
    (9, backend_y + 0.4, 'Gestión\nMulti-tenant')
]

for x, y, text in backend_components:
    ax.text(x, y, text, ha='center', va='center', fontsize=8,
            bbox=dict(boxstyle="round,pad=0.2", facecolor='white', alpha=0.9))

# ===== CAPA DE DATOS =====
data_y = 1.5
ax.add_patch(FancyBboxPatch((2, data_y), 8, 1.2, 
                           boxstyle="round,pad=0.1", 
                           facecolor=colors['database'], 
                           alpha=0.8,
                           edgecolor='black',
                           linewidth=1))

ax.text(6, data_y + 0.9, 'Capa de Datos', 
        ha='center', va='center', fontsize=12, fontweight='bold', color='white')

# Bases de datos tenants
tenant_dbs = [
    (3.5, data_y + 0.5, 'Esquema Tenant A\nPostgreSQL', colors['white']),
    (6, data_y + 0.5, 'Esquema Tenant B\nPostgreSQL', colors['white']),
    (8.5, data_y + 0.5, 'Esquema Tenant C\nPostgreSQL', colors['white'])
]

for x, y, text, color in tenant_dbs:
    ax.add_patch(Rectangle((x-1, y-0.2), 1.8, 0.4, 
                          facecolor=color, alpha=0.7, edgecolor='black'))
    ax.text(x, y, text, ha='center', va='center', fontsize=8)

# Almacenamiento
storage_y = 0.5
ax.add_patch(FancyBboxPatch((4, storage_y), 4, 0.6, 
                           boxstyle="round,pad=0.1", 
                           facecolor=colors['storage'], 
                           alpha=0.8,
                           edgecolor='black',
                           linewidth=1))

ax.text(6, storage_y + 0.3, 'Almacenamiento de Objetos\n(Evidencia Documental)', 
        ha='center', va='center', fontsize=10, fontweight='bold', color='white')

# Conexiones
ax.plot([6, 6], [frontend_y - 0.1, backend_y + 0.91], 'k-', alpha=0.7, linewidth=2)
ax.plot([6, 6], [backend_y - 0.1, data_y + 1.31], 'k-', linewidth=2, alpha=0.7)
ax.plot([6, 6], [data_y - 0.1, storage_y + 0.71], 'k-', linewidth=2, alpha=0.7)

# Configuración del gráfico
ax.set_xlim(0, 12)
ax.set_ylim(0, 7.5)
ax.set_aspect('equal')
ax.axis('off')

# Título
plt.title('Arquitectura SaaS Multi-tenant para Plataforma de Cumplimiento Ciberseguridad', 
          fontsize=14, fontweight='bold', pad=20)

# Leyenda
legend_elements = [
    plt.Line2D([0], [0], color=colors['client'], lw=4, label='Cliente/Tenant'),
    plt.Line2D([0], [0], color=colors['frontend'], lw=4, label='Frontend'),
    plt.Line2D([0], [0], color=colors['backend'], lw=4, label='Backend'),
    plt.Line2D([0], [0], color=colors['database'], lw=4, label='Base de Datos'),
    plt.Line2D([0], [0], color=colors['storage'], lw=4, label='Almacenamiento')
]

ax.legend(handles=legend_elements, loc='upper center', 
          bbox_to_anchor=(0.5, -0.05), ncol=3, fontsize=10)

plt.tight_layout()
plt.savefig('proyecto/arquitectura_saas_multitenant.pdf', 
            bbox_inches='tight', 
            dpi=300, 
            format='pdf')
plt.savefig('proyecto/arquitectura.png', 
            bbox_inches='tight', 
            dpi=300, 
            format='png')
plt.show()