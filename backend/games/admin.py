from django.contrib import admin

from .models import Game, Participant


class ParticipantInline(admin.TabularInline):
    model = Participant
    fields = ("player", "score", "correct_answers", "final_rank")
    autocomplete_fields = ("player",)
    extra = 0


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ("code", "quiz", "status", "created_at", "finished_at")
    list_filter = ("status",)
    list_select_related = ("quiz",)
    search_fields = ("code", "quiz__title")
    autocomplete_fields = ("quiz",)
    inlines = [ParticipantInline]
