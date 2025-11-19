from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import DashboardStatsAPIView, VerifyEmailAPIView, CheckEmailStatusAPIView, VerifyFileAPIView, sendgrid_webhook

router = DefaultRouter()
router.register(r'evaluation', views.EvaluationViewSet, basename='evaluation')
router.register(r'answers', views.AnswerViewSet, basename='answer')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard-stats/', DashboardStatsAPIView.as_view(), name='dashboard-stats'),
    path('verify-email/', VerifyEmailAPIView.as_view(), name='verify-email'),
    path('check-email-status/', CheckEmailStatusAPIView.as_view(), name='check-email-status'),
    path('verify-file/', VerifyFileAPIView.as_view(), name='verify-file'),
    path('sendgrid-webhook/', sendgrid_webhook, name='sendgrid-webhook'),
]