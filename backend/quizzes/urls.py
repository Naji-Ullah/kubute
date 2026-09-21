from rest_framework.routers import SimpleRouter

from .views import QuizViewSet

router = SimpleRouter(trailing_slash=False)
router.register("quizzes", QuizViewSet, basename="quiz")

urlpatterns = router.urls
