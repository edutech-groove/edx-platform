# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from django.conf import settings
from django.views.decorators.csrf import ensure_csrf_cookie
from util.cache import cache_if_anonymous
import courseware.views.views
from edxmako.shortcuts import marketing_link, render_to_response, render_to_string
from courseware.courses import (
    get_courses, 
    sort_by_start_date,
    sort_by_announcement
)
from openedx.core.djangoapps.site_configuration import helpers as configuration_helpers
from openedx.core.djangoapps.catalog.utils import get_programs, get_programs_with_type
from openedx.features.journals.api import get_journals_context


@ensure_csrf_cookie
@cache_if_anonymous()
def index(request):
    courses_list = []
    course_discovery_meanings = getattr(settings, 'COURSE_DISCOVERY_MEANINGS', {})
    if not settings.FEATURES.get('ENABLE_COURSE_DISCOVERY'):
        courses_list = get_courses(request.user)

        if configuration_helpers.get_value("ENABLE_COURSE_SORTING_BY_START_DATE",
                                           settings.FEATURES["ENABLE_COURSE_SORTING_BY_START_DATE"]):
            courses_list = sort_by_start_date(courses_list)
        else:
            courses_list = sort_by_announcement(courses_list)

    # Add marketable programs to the context.
    programs_list = get_programs_with_type(request.site, include_hidden=False)

    return render_to_response(
        "courses_programs_search/index.html",
        {
            'courses': courses_list,
            'course_discovery_meanings': course_discovery_meanings,
            'programs_list': programs_list,
            'journal_info': get_journals_context(request),  # TODO: Course Listing Plugin required
        }
    )