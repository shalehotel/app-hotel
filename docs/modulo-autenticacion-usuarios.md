# 🔐 Módulo de Autenticación y Usuarios

## ✅ Implementación Completa

### **Características:**

1. **Autenticación (Login/Logout)**
   - Login con validación de email y contraseña
   - Verificación de usuario activo
   - Cierre de sesión desde el sidebar
   - Protección de rutas

2. **Gestión de Usuarios (Solo Admin)**
   - CRUD completo de usuarios
   - Asignación de roles
   - Activar/Desactivar usuarios
   - Resetear contraseñas
   - Creación automática en Auth + DB

3. **Sistema de Roles**
   - ADMIN: Acceso completo
   - RECEPCION: Operaciones diarias
   - HOUSEKEEPING: Gestión de limpieza

---

## 📍 Rutas Implementadas

- `/login` - Página de inicio de sesión
- `/configuracion/usuarios` - Gestión de usuarios (Solo admin)
- `/` - Dashboard principal (Requiere autenticación)

---

## 🚀 Configuración Inicial

### **1. Crear Usuario Administrador**

Como Supabase Auth y la tabla `usuarios` están separadas, sigue estos pasos:

#### **Opción A: Desde Supabase Dashboard (Recomendado)**

1. Ve a **Supabase Dashboard** → **Authentication** → **Users**
2. Click en **"Add User"**
3. Ingresa:
   - Email: `admin@hotel.com`
   - Password: `admin123` (cambiar después)
   - ✅ **Auto Confirm User**: Activar
4. Click en **"Create User"**
5. **Copia el UUID** del usuario creado
6. Ve a **SQL Editor** y ejecuta:

```sql
INSERT INTO public.usuarios (id, rol, nombres, apellidos, estado)
VALUES (
    'PEGAR-UUID-AQUI'::uuid,
    'ADMIN'::rol_usuario_enum,
    'Admin',
    'Sistema',
    true
);
```

#### **Opción B: Desde el código (Una vez tengas un admin)**

Una vez tengas acceso como admin, puedes crear nuevos usuarios desde:
- **Configuración → Usuarios → Nuevo Usuario**

---

## 🔒 Seguridad Implementada

### **1. Protección de Rutas**
- Middleware verifica sesión en todas las rutas
- Redirect automático a `/login` si no está autenticado

### **2. Protección por Roles**
```typescript
// Solo admins pueden gestionar usuarios
await verificarEsAdmin()
```

### **3. Validaciones**
- No puedes eliminar tu propio usuario
- No puedes desactivar tu propio usuario
- Passwords mínimo 6 caracteres

---

## 📁 Archivos Creados/Modificados

### **Server Actions**
- `lib/actions/usuarios.ts` - CRUD de usuarios con verificación de permisos
- `lib/actions/auth.ts` - Actualizado para nueva estructura de BD

### **Páginas**
- `app/(dashboard)/configuracion/usuarios/page.tsx`
- `app/(dashboard)/configuracion/usuarios/usuarios-client.tsx`

### **Componentes Actualizados**
- `components/nav-user.tsx` - Adaptado a nueva estructura
- `components/app-sidebar.tsx` - Tipos actualizados
- `app/(dashboard)/layout.tsx` - Serialización de datos de usuario

### **Base de Datos**
- `supabase/seed.sql` - Roles y datos iniciales

---

## 🎯 Uso del Sistema

### **Como Admin:**

1. **Crear Usuario:**
   - Ir a Configuración → Usuarios
   - Click en "Nuevo Usuario"
   - Completar formulario (email, password, nombres, rol)
   - El sistema crea automáticamente en Auth + DB

2. **Editar Usuario:**
   - Click en icono de lápiz
   - Modificar datos (no se puede cambiar email)

3. **Resetear Contraseña:**
   - Click en icono de llave
   - Ingresar nueva contraseña

4. **Activar/Desactivar:**
   - Click en botón de estado (verde/rojo)
   - Usuario inactivo no puede iniciar sesión

5. **Eliminar:**
   - Click en icono de basurero
   - Confirmar eliminación (elimina de Auth + DB)

### **Como Usuario Normal:**

1. **Login:**
   - Ir a `/login`
   - Ingresar credenciales
   - Redirect automático al dashboard

2. **Logout:**
   - Click en avatar en sidebar
   - Seleccionar "Cerrar sesión"

---

## 🔧 Flujo Técnico

### **Login:**
```
Usuario ingresa email/password
    ↓
Supabase Auth valida credenciales
    ↓
Buscar en tabla `usuarios` por auth.uid
    ↓
Verificar estado = true
    ↓
Cargar datos con rol
    ↓
Crear sesión + redirect
```

### **Crear Usuario:**
```
Admin completa formulario
    ↓
Crear en Supabase Auth (admin.createUser)
    ↓
Insertar en tabla `usuarios` con rol_id
    ↓
Si falla DB → Eliminar de Auth (rollback)
    ↓
Revalidar página
```

---

## ⚠️ Notas Importantes

1. **RLS Policies:** Asegúrate de tener políticas RLS configuradas si las necesitas
2. **Admin API:** Se usa `supabase.auth.admin.*` que requiere service_role
3. **Cascada:** Al eliminar de Auth, se elimina automáticamente de `usuarios` (ON DELETE CASCADE)
4. **Email Único:** Supabase Auth no permite emails duplicados

---

## 🐛 Troubleshooting

### "Usuario no autorizado" al hacer login
- Verifica que el usuario exista en la tabla `usuarios`
- Ejecuta: `SELECT * FROM usuarios WHERE id = 'user-uuid'`

### No puedo crear usuarios
- Verifica que tu usuario tenga rol ADMIN
- Ejecuta: `SELECT * FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE u.id = 'tu-uuid'`

### Error al eliminar usuario
- No puedes eliminar tu propio usuario
- Verifica que el usuario no tenga reservas activas (si implementaste esa restricción)

---

## 📊 Estructura de Datos

```
auth.users (Supabase Auth)
  ├── id (UUID)
  ├── email
  └── encrypted_password

public.usuarios (Tu DB)
  ├── id (FK → auth.users.id)
  ├── rol (ENUM: 'ADMIN' | 'RECEPCION' | 'HOUSEKEEPING')
  ├── nombres
  ├── apellidos
  └── estado
```

**Nota:** Los roles son un ENUM en PostgreSQL, no una tabla separada. Esto hace el sistema más eficiente y type-safe.

---

## ✅ Checklist de Implementación

- [x] Login con validación
- [x] Logout funcional
- [x] Protección de rutas
- [x] CRUD de usuarios (solo admin)
- [x] Sistema de roles
- [x] Resetear contraseñas
- [x] Activar/Desactivar usuarios
- [x] Validaciones de seguridad
- [x] Toast notifications
- [x] Seed data con roles

---

**Sistema listo para producción** 🚀
