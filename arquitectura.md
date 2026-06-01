# Arquitectura del Proyecto – VITO Mobile App

## Descripción General

VITO es una aplicación móvil Android desarrollada en Kotlin utilizando una arquitectura moderna basada en MVVM y Jetpack Compose.

La aplicación se conecta a un backend en Supabase para autenticación, almacenamiento y persistencia de datos, y consume un servicio externo desarrollado en FastAPI para funcionalidades de Machine Learning.

---

# Stack Tecnológico

## Mobile App

* Lenguaje: Kotlin
* UI Framework: Jetpack Compose
* Arquitectura: MVVM (Model – View – ViewModel)
* Navegación: Navigation Compose
* Manejo de estado: StateFlow + Kotlin Coroutines
* Persistencia local: Room Database

---

## Backend y Servicios

### Supabase

Utilizado como Backend-as-a-Service (BaaS).

Responsabilidades:

* Autenticación de usuarios
* Base de datos PostgreSQL
* Storage de archivos
* APIs y acceso a datos

### Servicio de Machine Learning

* Framework: FastAPI
* Función:

    * Procesamiento de datos biométricos
    * Predicciones del modelo de Machine Learning
    * Comunicación mediante endpoints REST

---

# Arquitectura General

```text
Android App (Kotlin + Jetpack Compose)
        │
        ├── Supabase
        │     ├── PostgreSQL
        │     ├── Storage
        │     └── Authentication
        │
        └── FastAPI ML Service
              └── Modelo de Machine Learning
```

---

# Patrón Arquitectónico

## MVVM (Model – View – ViewModel)

La aplicación debe seguir estrictamente el patrón MVVM.

### Responsabilidades

#### View (UI)

* Pantallas hechas con Jetpack Compose
* Observan estados expuestos por ViewModels
* No contienen lógica de negocio

#### ViewModel

* Manejan el estado de la UI
* Ejecutan lógica de presentación
* Usan Coroutines y StateFlow
* Consumen repositories

#### Repository

* Fuente única de acceso a datos
* Coordinan acceso remoto y local
* Manejan Supabase, APIs y Room

#### Data Layer

Contiene:

* DTOs
* Models
* APIs
* DataSources
* Implementaciones de repositories

#### Domain Layer

Contiene:

* Casos de uso (UseCases)
* Entidades de dominio
* Lógica de negocio pura

---

# Estructura del Proyecto

```text
app/
│
├── ui/
│   ├── screens/
│   ├── components/
│   ├── navigation/
│   └── theme/
│
├── viewmodel/
│
├── repository/
│
├── data/
│   ├── remote/
│   ├── local/
│   ├── model/
│   └── dto/
│
├── domain/
│   ├── model/
│   └── usecase/
│
└── utils/
```

---

# Reglas de Arquitectura

## UI

* Toda la UI debe realizarse con Jetpack Compose.
* No usar XML layouts.
* Las pantallas deben ser reutilizables y desacopladas.

## Estado

* El estado debe manejarse con StateFlow.
* Usar collectAsState() en Compose.
* Evitar estados mutables fuera del ViewModel.

## Concurrencia

* Usar Kotlin Coroutines.
* Evitar callbacks tradicionales.
* Toda operación de red o base de datos debe ejecutarse de manera asíncrona.

## Navegación

* Usar Navigation Compose.
* Centralizar rutas en un único archivo o sealed class.

## Persistencia Local

* Usar Room para cache y almacenamiento offline.
* Los repositories deben decidir cuándo usar datos locales o remotos.

## APIs

* El acceso a Supabase y FastAPI debe estar encapsulado en la capa data.
* Nunca consumir APIs directamente desde la UI.

---

# Integración con Machine Learning

El servicio FastAPI se encargará de:

* Recibir datos biométricos
* Ejecutar inferencias del modelo ML
* Retornar predicciones y métricas

La app Android:

* Consume el servicio vía HTTP REST
* No ejecuta modelos localmente
* Solo muestra resultados y métricas procesadas

---

# Objetivo de Esta Arquitectura

Esta arquitectura busca:

* Escalabilidad
* Separación clara de responsabilidades
* Fácil mantenimiento
* Testing simplificado
* Reutilización de componentes
* Compatibilidad con buenas prácticas Android modernas

---

# Restricciones Técnicas

La IA o cualquier desarrollador que trabaje en este proyecto debe respetar:

* MVVM como arquitectura principal
* Jetpack Compose obligatorio
* Kotlin obligatorio
* StateFlow + Coroutines para estados
* Navigation Compose para navegación
* Room para persistencia local
* Supabase como backend principal
* FastAPI como servicio de Machine Learning

No introducir arquitecturas distintas sin justificación técnica.
No mezclar múltiples patrones arquitectónicos innecesariamente.

```
```
