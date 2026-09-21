from django.contrib import admin
from django.urls import include, path

# API routes have no trailing slash: Next.js strips it before proxying /api.
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("api/auth/", include("users.urls")),
    path("api/", include("quizzes.urls")),
    path("api/games/", include("games.urls")),
]
