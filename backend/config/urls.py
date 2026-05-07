from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path("admin/",          admin.site.urls),

    # auth
    path("api/auth/",       include("apps.accounts.urls")),

    # api docs
    path("api/schema/",         SpectacularAPIView.as_view(),        name="schema"),
    path("api/schema/swagger/", SpectacularSwaggerView.as_view(),    name="swagger"),
    path("api/schema/redoc/",   SpectacularRedocView.as_view(),      name="redoc"),
    path("api/dealers/", include("apps.dealers.urls")),
    path("api/invoices/", include("apps.invoices.urls")),
    path("api/inventory/", include("apps.inventory.urls")),
    path("api/reconciliation/", include("apps.reconciliation.urls")),
    path("api/commissions/", include("apps.commissions.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/reports/", include("apps.reports.urls")),
]
