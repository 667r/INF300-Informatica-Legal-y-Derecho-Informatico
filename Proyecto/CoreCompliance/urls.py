from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import DashboardStatsAPIView

router = DefaultRouter()
router.register(r'evaluation', views.EvaluationViewSet, basename='evaluation')
router.register(r'answers', views.AnswerViewSet, basename='answer')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard-stats/', DashboardStatsAPIView.as_view(), name='dashboard-stats'),
    
]