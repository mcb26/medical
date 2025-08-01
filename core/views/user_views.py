from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..models import User
from ..serializers import UserSerializer
from django.utils import timezone
from datetime import datetime, timedelta
from ..serializers import ModulePermissionSerializer, UserRoleSerializer
from ..models import UserRole, ModulePermission, UserActivityLog

class UserRoleViewSet(viewsets.ModelViewSet):
    queryset = UserRole.objects.all()
    serializer_class = UserRoleSerializer
    permission_classes = [IsAuthenticated]

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        try:
            serializer = self.get_serializer(request.user)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['patch'])
    def update_theme(self, request, pk=None):
        """Aktualisiert die Theme-Einstellungen eines Benutzers"""
        user = self.get_object()
        
        # Theme-Einstellungen aktualisieren
        theme_fields = ['theme_mode', 'theme_accent_color', 'theme_font_size', 'theme_compact_mode']
        for field in theme_fields:
            if field in request.data:
                setattr(user, field, request.data[field])
        
        user.save()
        
        return Response({
            'message': 'Theme-Einstellungen aktualisiert',
            'theme_settings': {
                'theme_mode': user.theme_mode,
                'theme_accent_color': user.theme_accent_color,
                'theme_font_size': user.theme_font_size,
                'theme_compact_mode': user.theme_compact_mode,
            }
        })
    
    @action(detail=True, methods=['get'])
    def permissions(self, request, pk=None):
        """Gibt alle Berechtigungen eines Benutzers zurück"""
        user = self.get_object()
        permissions = user.get_effective_permissions()
        
        return Response({
            'user_id': user.id,
            'username': user.username,
            'permissions': permissions
        })
    
    @action(detail=True, methods=['post'])
    def grant_permission(self, request, pk=None):
        """Erteilt eine Modul-Berechtigung"""
        user = self.get_object()
        
        module = request.data.get('module')
        permission = request.data.get('permission', 'read')
        expires_at = request.data.get('expires_at')
        
        if not module:
            return Response(
                {'error': 'Modul ist erforderlich'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Datum parsen falls vorhanden
        if expires_at:
            try:
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            except ValueError:
                return Response(
                    {'error': 'Ungültiges Datum für expires_at'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        try:
            module_perm = user.grant_module_permission(
                module_name=module,
                permission_level=permission,
                granted_by=request.user,
                expires_at=expires_at
            )
            
            return Response({
                'message': f'Berechtigung für {module} erteilt',
                'permission': ModulePermissionSerializer(module_perm).data
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def revoke_permission(self, request, pk=None):
        """Entzieht eine Modul-Berechtigung"""
        user = self.get_object()
        module = request.data.get('module')
        
        if not module:
            return Response(
                {'error': 'Modul ist erforderlich'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        success = user.revoke_module_permission(module)
        
        if success:
            return Response({
                'message': f'Berechtigung für {module} entzogen'
            })
        else:
            return Response(
                {'error': f'Keine Berechtigung für {module} gefunden'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def bulk_update_permissions(self, request, pk=None):
        """Aktualisiert mehrere Berechtigungen auf einmal"""
        user = self.get_object()
        permissions = request.data.get('permissions', {})
        
        updated_permissions = []
        
        for module, permission_data in permissions.items():
            permission_level = permission_data.get('permission', 'none')
            expires_at = permission_data.get('expires_at')
            
            # Datum parsen falls vorhanden
            if expires_at:
                try:
                    expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                except ValueError:
                    continue
            
            try:
                module_perm = user.grant_module_permission(
                    module_name=module,
                    permission_level=permission_level,
                    granted_by=request.user,
                    expires_at=expires_at
                )
                updated_permissions.append(ModulePermissionSerializer(module_perm).data)
            except Exception as e:
                continue
        
        return Response({
            'message': f'{len(updated_permissions)} Berechtigungen aktualisiert',
            'updated_permissions': updated_permissions
        })

    # Admin-spezifische Endpunkte
    @action(detail=False, methods=['get'])
    def admin_overview(self, request):
        """Admin-Übersicht über alle Benutzer und Berechtigungen"""
        if not request.user.is_admin and not request.user.is_superuser:
            return Response(
                {'error': 'Admin-Berechtigung erforderlich'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        users = User.objects.all()
        roles = UserRole.objects.all()
        
        # Statistiken sammeln
        stats = {
            'total_users': users.count(),
            'active_users': users.filter(is_active=True).count(),
            'admin_users': users.filter(is_admin=True).count(),
            'users_with_roles': users.filter(role__isnull=False).count(),
            'total_roles': roles.count(),
            'active_roles': roles.filter(is_active=True).count(),
        }
        
        # Modul-Berechtigungsstatistiken
        module_stats = {}
        for module in ModulePermission.MODULE_CHOICES:
            module_code = module[0]
            module_name = module[1]
            
            permissions = ModulePermission.objects.filter(
                module=module_code,
                is_active=True
            )
            
            module_stats[module_code] = {
                'name': module_name,
                'total_permissions': permissions.count(),
                'permission_breakdown': {}
            }
            
            for perm_level in ModulePermission.PERMISSION_CHOICES:
                level_code = perm_level[0]
                count = permissions.filter(permission=level_code).count()
                module_stats[module_code]['permission_breakdown'][level_code] = count
        
        return Response({
            'stats': stats,
            'module_stats': module_stats,
            'recent_activity': UserActivityLog.objects.order_by('-timestamp')[:10]
        })

    @action(detail=False, methods=['post'])
    def bulk_admin_operations(self, request):
        """Bulk-Operationen für Admins"""
        if not request.user.is_admin and not request.user.is_superuser:
            return Response(
                {'error': 'Admin-Berechtigung erforderlich'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        operation = request.data.get('operation')
        user_ids = request.data.get('user_ids', [])
        data = request.data.get('data', {})
        
        if not user_ids:
            return Response(
                {'error': 'Keine Benutzer ausgewählt'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        users = User.objects.filter(id__in=user_ids)
        updated_count = 0
        
        try:
            if operation == 'toggle_admin':
                for user in users:
                    user.is_admin = not user.is_admin
                    user.save()
                    updated_count += 1
                    
            elif operation == 'toggle_status':
                for user in users:
                    user.is_active = not user.is_active
                    user.save()
                    updated_count += 1
                    
            elif operation == 'update_permissions':
                permissions = data.get('permissions', {})
                for user in users:
                    for module, permission_data in permissions.items():
                        permission_level = permission_data.get('permission', 'none')
                        user.grant_module_permission(
                            module_name=module,
                            permission_level=permission_level,
                            granted_by=request.user
                        )
                    updated_count += 1
                    
            elif operation == 'assign_role':
                role_id = data.get('role_id')
                if role_id:
                    role = UserRole.objects.get(id=role_id)
                    for user in users:
                        user.role = role
                        user.save()
                        updated_count += 1
                        
            else:
                return Response(
                    {'error': 'Unbekannte Operation'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            return Response({
                'message': f'{updated_count} Benutzer erfolgreich aktualisiert',
                'updated_count': updated_count
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def system_status(self, request):
        """System-Status für Admins"""
        if not request.user.is_admin and not request.user.is_superuser:
            return Response(
                {'error': 'Admin-Berechtigung erforderlich'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        from django.db import connection
        from django.core.cache import cache
        
        # Datenbank-Status
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM core_user")
                user_count = cursor.fetchone()[0]
                
                cursor.execute("SELECT COUNT(*) FROM core_modulepermission")
                permission_count = cursor.fetchone()[0]
                
                cursor.execute("SELECT COUNT(*) FROM core_useractivitylog")
                log_count = cursor.fetchone()[0]
        except Exception as e:
            db_status = {'error': str(e)}
        else:
            db_status = {
                'users': user_count,
                'permissions': permission_count,
                'activity_logs': log_count,
                'status': 'healthy'
            }
        
        # Cache-Status
        cache_status = {
            'available': cache.get('test_key') is None,  # Test ob Cache funktioniert
            'status': 'healthy' if cache.get('test_key') is None else 'error'
        }
        
        # Berechtigungssystem-Status
        permission_system_status = {
            'version': '2.0.0',
            'modules': len(ModulePermission.MODULE_CHOICES),
            'permission_levels': len(ModulePermission.PERMISSION_CHOICES),
            'active_permissions': ModulePermission.objects.filter(is_active=True).count(),
            'expired_permissions': ModulePermission.objects.filter(
                expires_at__lt=timezone.now(),
                is_active=True
            ).count()
        }
        
        return Response({
            'database': db_status,
            'cache': cache_status,
            'permission_system': permission_system_status,
            'timestamp': timezone.now()
        }) 