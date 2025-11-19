from django.shortcuts import render
from django.conf import settings
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
import json
import sendgrid
from sendgrid.helpers.mail import Mail
from .models import ComplianceDomain, ControlRule, Answer, AnswerFile
from .serializers import ComplianceDomainSerializer, AnswerSerializer

# Create your views here.

class EvaluationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API Endpoint (READ-ONLY) para obtener la autoevaluación completa.
    Esto entrega todos los Dominios, anidando sus Reglas,
    y anidando las Respuestas del usuario actual.
    
    Es la implementación de la Funcionalidad 1.A.
    """
    queryset = ComplianceDomain.objects.all().prefetch_related('rules', 'rules__answers', 'rules__answers__files')
    serializer_class = ComplianceDomainSerializer
    # Solo usuarios autenticados pueden ver esto
    permission_classes = [permissions.IsAuthenticated]

    # Sobreescribimos 'get_serializer_context' para pasar el 'request'
    # al 'ControlRuleSerializer' y así poder obtener el 'user'.
    def get_serializer_context(self):
        return {'request': self.request}


class AnswerViewSet(viewsets.ModelViewSet):
    """
    API Endpoint (READ-WRITE) para crear y actualizar Respuestas.
    Aquí es donde el frontend guardará los cambios.
    """
    queryset = Answer.objects.all()
    serializer_class = AnswerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filtra el queryset para que un usuario solo pueda ver
        y editar SUS PROPIAS respuestas.
        """
        return Answer.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """
        Personalizamos la creación de una Respuesta.
        El usuario no debe enviar su ID, lo tomamos del request.
        Tampoco debe elegir la regla, la recibimos en la data.
        """
        # Buscamos la regla que se quiere responder
        try:
            rule = ControlRule.objects.get(id=request.data.get('rule_id'))
        except ControlRule.DoesNotExist:
            return Response(
                {"error": "Regla no encontrada."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificamos si ya existe una respuesta para este usuario y regla
        answer, created = Answer.objects.get_or_create(
            user=request.user,
            rule=rule
        )
        
        # Separar archivos del resto de los datos
        files_data = {}
        data_copy = {}
        
        # Iterar sobre request.data sin usar .copy() (los archivos no se pueden copiar)
        for key, value in request.data.items():
            if key.startswith('file_'):
                file_type = key.replace('file_', '')
                # Intentar obtener el archivo de request.FILES primero, luego de request.data
                if key in request.FILES:
                    file_obj = request.FILES[key]
                else:
                    file_obj = value
                files_data[file_type] = file_obj
            else:
                # Copiar solo los datos que no son archivos
                data_copy[key] = value
        
        # Actualizamos la respuesta con los datos del request (sin archivos)
        # 'partial=True' permite actualizar solo algunos campos (como en PATCH)
        serializer = self.get_serializer(answer, data=data_copy, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save() # Aquí NO pasamos user/rule, ya están en el objeto 'answer'
        
        # Manejar archivos múltiples
        for file_type, file_obj in files_data.items():
            # Debug: ver qué tipo de objeto recibimos
            print(f"DEBUG: Procesando archivo tipo '{file_type}': {type(file_obj)}, valor: {file_obj}")
            # Verificar si es un archivo real (tiene método read) o un string vacío
            if file_obj and hasattr(file_obj, 'read'):  # Es un archivo real
                print(f"DEBUG: Creando AnswerFile para tipo '{file_type}'")
                # Eliminar archivo existente del mismo tipo si existe
                AnswerFile.objects.filter(answer=answer, file_type=file_type).delete()
                # Crear nuevo archivo
                AnswerFile.objects.create(
                    answer=answer,
                    file=file_obj,
                    file_type=file_type
                )
            elif file_obj == '' or file_obj is None:  # Si se envía string vacío o None, eliminar el archivo
                print(f"DEBUG: Eliminando AnswerFile para tipo '{file_type}'")
                AnswerFile.objects.filter(answer=answer, file_type=file_type).delete()
            else:
                print(f"DEBUG: Archivo tipo '{file_type}' no procesado (tipo: {type(file_obj)})")

        # Refrescar el objeto answer desde la base de datos para incluir los archivos actualizados
        answer.refresh_from_db()
        # Re-serializar con los archivos actualizados
        updated_serializer = self.get_serializer(answer)
        print(f"DEBUG: Respuesta serializada incluye {len(updated_serializer.data.get('files', []))} archivos")
        return Response(updated_serializer.data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        """
        Actualiza una respuesta existente, manejando archivos múltiples.
        """
        answer = self.get_object()
        
        # Separar archivos del resto de los datos
        files_data = {}
        data_copy = {}
        
        # Iterar sobre request.data sin usar .copy() (los archivos no se pueden copiar)
        for key, value in request.data.items():
            if key.startswith('file_'):
                file_type = key.replace('file_', '')
                # Intentar obtener el archivo de request.FILES primero, luego de request.data
                if key in request.FILES:
                    file_obj = request.FILES[key]
                else:
                    file_obj = value
                files_data[file_type] = file_obj
            else:
                # Copiar solo los datos que no son archivos
                data_copy[key] = value
        
        # Actualizar campos de texto y otros datos
        serializer = self.get_serializer(answer, data=data_copy, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Manejar archivos múltiples
        for file_type, file_obj in files_data.items():
            # Debug: ver qué tipo de objeto recibimos
            print(f"DEBUG: Procesando archivo tipo '{file_type}': {type(file_obj)}, valor: {file_obj}")
            # Verificar si es un archivo real (tiene método read) o un string vacío
            if file_obj and hasattr(file_obj, 'read'):  # Es un archivo real
                print(f"DEBUG: Creando AnswerFile para tipo '{file_type}'")
                # Eliminar archivo existente del mismo tipo si existe
                AnswerFile.objects.filter(answer=answer, file_type=file_type).delete()
                # Crear nuevo archivo
                AnswerFile.objects.create(
                    answer=answer,
                    file=file_obj,
                    file_type=file_type
                )
            elif file_obj == '' or file_obj is None:  # Si se envía string vacío o None, eliminar el archivo
                print(f"DEBUG: Eliminando AnswerFile para tipo '{file_type}'")
                AnswerFile.objects.filter(answer=answer, file_type=file_type).delete()
            else:
                print(f"DEBUG: Archivo tipo '{file_type}' no procesado (tipo: {type(file_obj)})")
        
        # Refrescar el objeto answer desde la base de datos para incluir los archivos actualizados
        answer.refresh_from_db()
        # Re-serializar con los archivos actualizados
        updated_serializer = self.get_serializer(answer)
        print(f"DEBUG: Respuesta serializada incluye {len(updated_serializer.data.get('files', []))} archivos")
        return Response(updated_serializer.data)

class DashboardStatsAPIView(APIView):
    """
    Endpoint simple que calcula las estadísticas del dashboard.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        total_rules = ControlRule.objects.count()
        
        if total_rules == 0:
            return Response({"percentage": 0, "compliant": 0, "total": 0})

        compliant_rules = Answer.objects.filter(
            user=user, 
            status=Answer.StatusChoices.COMPLIANT
        ).count()
        
        percentage = (compliant_rules / total_rules) * 100
        
        return Response({
            "percentage": round(percentage, 1),
            "compliant": compliant_rules,
            "total": total_rules
        })


class VerifyEmailAPIView(APIView):
    """
    Endpoint para verificar un email asociado a una respuesta.
    Cuando se llama, envía un email vía SendGrid y marca el email_status como 'pending'.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        answer_id = request.data.get('answer_id')
        
        if not answer_id:
            return Response(
                {"error": "answer_id es requerido"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            answer = Answer.objects.get(id=answer_id, user=request.user)
        except Answer.DoesNotExist:
            return Response(
                {"error": "Respuesta no encontrada"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not answer.email:
            return Response(
                {"error": "No hay email asociado a esta respuesta"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar que SendGrid esté configurado
        if not settings.SENDGRID_API_KEY:
            return Response(
                {"error": "SendGrid no está configurado"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Get baseline stats BEFORE sending
        baseline_requests = None
        baseline_delivered = None
        try:
            from datetime import datetime
            import urllib.request
            import urllib.parse
            import json as json_lib
            
            stats_url = "https://api.sendgrid.com/v3/stats"
            today = datetime.now().strftime('%Y-%m-%d')
            stats_params = {
                'start_date': today,
                'end_date': today,
                'aggregated_by': 'day'
            }
            
            stats_full_url = f"{stats_url}?{urllib.parse.urlencode(stats_params)}"
            stats_req = urllib.request.Request(stats_full_url)
            stats_req.add_header('Authorization', f'Bearer {settings.SENDGRID_API_KEY}')
            
            with urllib.request.urlopen(stats_req, timeout=10) as stats_response:
                stats_data = json_lib.loads(stats_response.read().decode())
                if stats_data and len(stats_data) > 0:
                    day_stats = stats_data[0].get('stats', [{}])
                    if day_stats and len(day_stats) > 0:
                        metrics = day_stats[0].get('metrics', {})
                        baseline_requests = metrics.get('requests', 0)
                        baseline_delivered = metrics.get('delivered', 0)
                        print(f"DEBUG: Baseline - Requests: {baseline_requests}, Delivered: {baseline_delivered}")
        except Exception as e:
            print(f"DEBUG: Error getting baseline stats: {e}")
        
        # Marcar email_status como 'pending' y guardar baseline
        answer.email_status = Answer.EmailStatusChoices.PENDING
        answer.email_verification_baseline_requests = baseline_requests
        answer.email_verification_baseline_delivered = baseline_delivered
        answer.save()
        
        # Enviar email vía SendGrid
        try:
            print(f"DEBUG: Intentando enviar email a {answer.email}")
            print(f"DEBUG: API Key configurado: {bool(settings.SENDGRID_API_KEY)}")
            print(f"DEBUG: From email: {settings.SENDGRID_FROM_EMAIL}")
            
            sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
            from_email = settings.SENDGRID_FROM_EMAIL
            
            message = Mail(
                from_email=from_email,
                to_emails=answer.email,
                subject='Verificación de Email - CoreCompliance',
                html_content='<p>Este es un email de verificación de CoreCompliance.</p>'
            )
            
            print(f"DEBUG: Enviando email...")
            response = sg.send(message)
            
            # Store the message ID for later status checking
            # SendGrid response includes X-Message-Id in headers
            message_id = None
            if hasattr(response, 'headers') and 'X-Message-Id' in response.headers:
                message_id = response.headers['X-Message-Id']
                # Store in a custom field or use a separate model
                # For now, we'll check by email and timestamp
            print(f"DEBUG: Email enviado exitosamente. Status code: {response.status_code}")
            print(f"DEBUG: Response headers: {dict(response.headers) if hasattr(response, 'headers') else 'N/A'}")
            print(f"DEBUG: Response body: {response.body if hasattr(response, 'body') else 'N/A'}")
            
            # Log to Django's logger for better visibility
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Email verification sent to {answer.email}. Status: {response.status_code}")
            
            return Response({
                "message": "Email de verificación enviado",
                "email_status": answer.email_status,
                "status_code": response.status_code
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            # Si falla el envío, mantener el status como pending
            # El webhook puede actualizarlo si el email se entrega
            import traceback
            print(f"DEBUG: Error al enviar email: {str(e)}")
            print(f"DEBUG: Traceback: {traceback.format_exc()}")
            return Response({
                "message": "Error al enviar email, pero el estado se marcó como pending",
                "email_status": answer.email_status,
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CheckEmailStatusAPIView(APIView):
    """
    Endpoint para verificar el estado de un email consultando SendGrid Activity API.
    Esto funciona sin necesidad de webhooks, útil para desarrollo local.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        answer_id = request.data.get('answer_id')
        
        if not answer_id:
            return Response(
                {"error": "answer_id es requerido"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            answer = Answer.objects.get(id=answer_id, user=request.user)
        except Answer.DoesNotExist:
            return Response(
                {"error": "Respuesta no encontrada"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not answer.email:
            return Response(
                {"error": "No hay email asociado a esta respuesta"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not settings.SENDGRID_API_KEY:
            return Response(
                {"error": "SendGrid no está configurado"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Query SendGrid Activity API to check actual email status
        try:
            from datetime import datetime, timedelta
            import urllib.request
            import urllib.parse
            import json as json_lib
            
            # Wait at least 30 seconds after sending before checking (SendGrid needs time to process)
            time_since_sent = datetime.now() - answer.last_updated.replace(tzinfo=None) if answer.last_updated else timedelta(0)
            
            if time_since_sent < timedelta(seconds=30):
                return Response({
                    "message": "Esperando procesamiento de SendGrid...",
                    "email_status": answer.email_status,
                    "time_since_sent_seconds": time_since_sent.total_seconds()
                }, status=status.HTTP_200_OK)
            
            # Check if we have baseline stats to compare against
            baseline_requests = answer.email_verification_baseline_requests
            baseline_delivered = answer.email_verification_baseline_delivered
            
            if baseline_requests is None or baseline_delivered is None:
                # No baseline stored, can't compare - wait a bit and try again
                if time_since_sent < timedelta(seconds=30):
                    return Response({
                        "message": "Esperando procesamiento inicial...",
                        "email_status": answer.email_status
                    }, status=status.HTTP_200_OK)
                # If no baseline after 30 seconds, get current stats as baseline
                baseline_requests = 0
                baseline_delivered = 0
            
            # Get current stats and compare with baseline
            stats_url = "https://api.sendgrid.com/v3/stats"
            today = datetime.now().strftime('%Y-%m-%d')
            stats_params = {
                'start_date': today,
                'end_date': today,
                'aggregated_by': 'day'
            }
            
            stats_full_url = f"{stats_url}?{urllib.parse.urlencode(stats_params)}"
            stats_req = urllib.request.Request(stats_full_url)
            stats_req.add_header('Authorization', f'Bearer {settings.SENDGRID_API_KEY}')
            print(f"DEBUG: Making stats request to: {stats_full_url}")
            print(f"DEBUG: Baseline - Requests: {baseline_requests}, Delivered: {baseline_delivered}")
            
            try:
                with urllib.request.urlopen(stats_req, timeout=10) as stats_response:
                    stats_data = json_lib.loads(stats_response.read().decode())
                    print(f"DEBUG: SendGrid Stats API response: {stats_data}")
                    
                    if stats_data and len(stats_data) > 0:
                        day_stats = stats_data[0].get('stats', [{}])
                        if day_stats and len(day_stats) > 0:
                            metrics = day_stats[0].get('metrics', {})
                            current_requests = metrics.get('requests', 0)
                            current_delivered = metrics.get('delivered', 0)
                            
                            print(f"DEBUG: Current - Requests: {current_requests}, Delivered: {current_delivered}")
                            print(f"DEBUG: Difference - Requests: {current_requests - baseline_requests}, Delivered: {current_delivered - baseline_delivered}")
                            
                            # Check if requests increased (our email was processed)
                            requests_increased = current_requests > baseline_requests
                            
                            if requests_increased:
                                # Our email was processed! Check if delivered also increased
                                delivered_increased = current_delivered > baseline_delivered
                                
                                if delivered_increased:
                                    # Both increased - email was delivered!
                                    answer.email_status = Answer.EmailStatusChoices.VALID
                                    answer.save()
                                    return Response({
                                        "message": "Email entregado correctamente",
                                        "email_status": answer.email_status,
                                        "stats": {
                                            "baseline": {"requests": baseline_requests, "delivered": baseline_delivered},
                                            "current": {"requests": current_requests, "delivered": current_delivered}
                                        }
                                    }, status=status.HTTP_200_OK)
                                else:
                                    # Requests increased but delivered didn't - email bounced!
                                    answer.email_status = Answer.EmailStatusChoices.BOUNCED
                                    answer.save()
                                    return Response({
                                        "message": "Email rebotado (requests aumentó pero delivered no)",
                                        "email_status": answer.email_status,
                                        "stats": {
                                            "baseline": {"requests": baseline_requests, "delivered": baseline_delivered},
                                            "current": {"requests": current_requests, "delivered": current_delivered}
                                        }
                                    }, status=status.HTTP_200_OK)
                            else:
                                # Requests hasn't increased yet - still processing
                                if time_since_sent > timedelta(minutes=2):
                                    # Been more than 2 minutes and requests hasn't increased - might be an issue
                                    return Response({
                                        "message": "Esperando procesamiento (requests no ha aumentado aún)",
                                        "email_status": answer.email_status,
                                        "stats": {
                                            "baseline": {"requests": baseline_requests, "delivered": baseline_delivered},
                                            "current": {"requests": current_requests, "delivered": current_delivered}
                                        }
                                    }, status=status.HTTP_200_OK)
                                else:
                                    return Response({
                                        "message": "Esperando procesamiento...",
                                        "email_status": answer.email_status
                                    }, status=status.HTTP_200_OK)
                    
                    # If stats API doesn't return data
                    if time_since_sent > timedelta(minutes=3):
                        return Response({
                            "message": "No se pudieron obtener stats - timeout",
                            "email_status": answer.email_status
                        }, status=status.HTTP_200_OK)
                    else:
                        return Response({
                            "message": "Esperando datos de SendGrid...",
                            "email_status": answer.email_status
                        }, status=status.HTTP_200_OK)
                        
            except urllib.error.HTTPError as e:
                error_body = e.read().decode() if hasattr(e, 'read') else str(e)
                print(f"DEBUG: SendGrid Stats API error: {e.code} - {error_body}")
                # If stats API fails, wait a bit and try again
                if time_since_sent > timedelta(minutes=3):
                    # After 2 minutes with no bounce detected, assume delivered
                    # (This is a fallback - ideally webhooks would handle this)
                    answer.email_status = Answer.EmailStatusChoices.VALID
                    answer.save()
                    return Response({
                        "message": "Estado verificado (fallback - use webhooks para precisión)",
                        "email_status": answer.email_status
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        "message": "Error consultando SendGrid, reintentando...",
                        "email_status": answer.email_status
                    }, status=status.HTTP_200_OK)
                
        except Exception as e:
            import traceback
            print(f"DEBUG: Error al verificar estado: {str(e)}")
            print(f"DEBUG: Traceback: {traceback.format_exc()}")
            return Response({
                "error": str(e),
                "email_status": answer.email_status
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyFileAPIView(APIView):
    """
    Endpoint para verificar archivos Excel/CSV.
    Verifica si hay una columna 'fecha' y calcula la antigüedad del registro más reciente.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        answer_id = request.data.get('answer_id')
        file_type = request.data.get('file_type')
        
        if not answer_id or not file_type:
            return Response(
                {"error": "answer_id y file_type son requeridos"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            answer = Answer.objects.get(id=answer_id, user=request.user)
        except Answer.DoesNotExist:
            return Response(
                {"error": "Respuesta no encontrada"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar que la regla requiere verificación para este tipo de archivo
        required_files = answer.rule.required_files or {}
        verification_months = required_files.get(file_type, 0)
        
        if verification_months == 0:
            return Response(
                {"error": "Este archivo no requiere verificación"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Buscar el archivo
        try:
            answer_file = AnswerFile.objects.get(answer=answer, file_type=file_type)
        except AnswerFile.DoesNotExist:
            return Response(
                {"error": "Archivo no encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar el archivo
        try:
            import pandas as pd
            from datetime import datetime, timedelta
            import os
            
            file_path = answer_file.file.path
            
            # Determinar el tipo de archivo por extensión
            file_ext = os.path.splitext(file_path)[1].lower()
            
            # Leer el archivo
            if file_ext in ['.xlsx', '.xls']:
                df = pd.read_excel(file_path)
            elif file_ext == '.csv':
                df = pd.read_csv(file_path)
            else:
                return Response(
                    {"error": "Formato de archivo no soportado. Use Excel (.xlsx, .xls) o CSV (.csv)"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Buscar columna 'fecha' (case insensitive)
            fecha_column = None
            for col in df.columns:
                if col.lower().strip() == 'fecha':
                    fecha_column = col
                    break
            
            if fecha_column is None:
                answer_file.file_verification_status = AnswerFile.FileVerificationStatusChoices.ERROR
                answer_file.file_verification_message = "No se encontró columna 'fecha' en el archivo"
                answer_file.save()
                return Response({
                    "error": "No se encontró columna 'fecha' en el archivo",
                    "status": answer_file.file_verification_status
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Convertir la columna fecha a datetime
            df[fecha_column] = pd.to_datetime(df[fecha_column], errors='coerce')
            
            # Eliminar filas con fechas inválidas
            df = df.dropna(subset=[fecha_column])
            
            if df.empty:
                answer_file.file_verification_status = AnswerFile.FileVerificationStatusChoices.ERROR
                answer_file.file_verification_message = "No se encontraron fechas válidas en el archivo"
                answer_file.save()
                return Response({
                    "error": "No se encontraron fechas válidas en el archivo",
                    "status": answer_file.file_verification_status
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Encontrar la fecha más reciente
            most_recent_date = df[fecha_column].max()
            
            # Calcular diferencia con hoy
            today = datetime.now().date()
            if isinstance(most_recent_date, pd.Timestamp):
                most_recent_date = most_recent_date.date()
            elif isinstance(most_recent_date, datetime):
                most_recent_date = most_recent_date.date()
            
            difference = today - most_recent_date
            months_diff = difference.days / 30.44  # Promedio de días por mes
            
            # Determinar estado según la diferencia
            if months_diff < verification_months:
                status_choice = AnswerFile.FileVerificationStatusChoices.UP_TO_DATE
                message = "Registros al día"
            elif months_diff < 12:
                status_choice = AnswerFile.FileVerificationStatusChoices.OUTDATED
                message = "Registros con >6 meses de antigüedad"
            else:
                status_choice = AnswerFile.FileVerificationStatusChoices.VERY_OUTDATED
                message = "Registros no están al día"
            
            # Guardar estado
            answer_file.file_verification_status = status_choice
            answer_file.file_verification_message = f"{message} (última fecha: {most_recent_date.strftime('%Y-%m-%d')}, diferencia: {int(months_diff)} meses)"
            answer_file.save()
            
            return Response({
                "status": status_choice,
                "message": message,
                "most_recent_date": most_recent_date.strftime('%Y-%m-%d'),
                "months_difference": round(months_diff, 1),
                "verification_message": answer_file.file_verification_message
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            error_msg = str(e)
            print(f"DEBUG: Error verificando archivo: {error_msg}")
            print(f"DEBUG: Traceback: {traceback.format_exc()}")
            
            answer_file.file_verification_status = AnswerFile.FileVerificationStatusChoices.ERROR
            answer_file.file_verification_message = f"Error al verificar: {error_msg}"
            answer_file.save()
            
            return Response({
                "error": f"Error al verificar archivo: {error_msg}",
                "status": answer_file.file_verification_status
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@require_http_methods(["POST"])
def sendgrid_webhook(request):
    """
    Webhook endpoint para recibir eventos de SendGrid.
    Actualiza el email_status basado en eventos de entrega, bounce, o dropped.
    """
    try:
        # SendGrid envía los eventos como un array JSON
        events = json.loads(request.body)
        
        if not isinstance(events, list):
            events = [events]
        
        updated_count = 0
        
        for event in events:
            event_type = event.get('event')
            email = event.get('email')
            
            if not email or not event_type:
                continue
            
            # Buscar todas las respuestas con este email
            answers = Answer.objects.filter(email=email)
            
            for answer in answers:
                if event_type == 'delivered':
                    answer.email_status = Answer.EmailStatusChoices.VALID
                    answer.save()
                    updated_count += 1
                elif event_type in ['bounce', 'dropped']:
                    answer.email_status = Answer.EmailStatusChoices.BOUNCED
                    answer.save()
                    updated_count += 1
        
        return JsonResponse({
            "message": f"Procesados {len(events)} eventos, {updated_count} respuestas actualizadas"
        }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse(
            {"error": "Invalid JSON"},
            status=400
        )
    except Exception as e:
        return JsonResponse(
            {"error": str(e)},
            status=500
        )