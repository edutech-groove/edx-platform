from . import views
from django.conf.urls import include, url

urlpatterns = [
    url(r'^$', views.index, name='courses_programs_search'),
]
