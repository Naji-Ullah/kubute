from django.contrib import admin

from .models import Choice, Question, Quiz


class QuestionInline(admin.TabularInline):
    model = Question
    fields = ("position", "text", "time_limit")
    extra = 0
    show_change_link = True


class ChoiceInline(admin.TabularInline):
    model = Choice
    fields = ("position", "text", "is_correct")
    extra = 0


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "updated_at")
    list_select_related = ("owner",)
    search_fields = ("title", "owner__username")
    inlines = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("text", "quiz", "position")
    list_select_related = ("quiz",)
    inlines = [ChoiceInline]
