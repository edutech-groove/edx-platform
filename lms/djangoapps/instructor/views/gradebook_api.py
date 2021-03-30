"""
Grade book view for instructor and pagination work (for grade book)
which is currently use by ccx and instructor apps.
"""
import math

from django.conf import settings
from django.contrib.auth.models import User
from django.urls import reverse
from django.db import transaction
from django.views.decorators.cache import cache_control
from opaque_keys.edx.keys import CourseKey
from urlparse import urljoin

from courseware.access import has_access
from courseware.courses import get_course_with_access, get_studio_url, get_course_by_id
from edxmako.shortcuts import render_to_response
from lms.djangoapps.grades.course_grade_factory import CourseGradeFactory
from lms.djangoapps.instructor.views.api import require_level
from xmodule.modulestore.django import modulestore
from student.models import CourseEnrollment
from student.roles import CourseFinanceAdminRole, CourseSalesAdminRole, CourseStaffRole, CourseInstructorRole
from django_comment_client.utils import has_forum_access, available_division_schemes
from django_comment_common.models import FORUM_ROLE_ADMINISTRATOR, CourseDiscussionSettings
from django.http import Http404, HttpResponseServerError
from course_modes.models import CourseMode
from openedx.core.djangoapps.site_configuration import helpers as configuration_helpers
from django.utils.translation import ugettext as _
from openedx.core.djangolib.markup import HTML, Text
from bulk_email.models import BulkEmailFlag
from lms.djangoapps.certificates import api as certs_api
from lms.djangoapps.certificates.models import (
    CertificateGenerationConfiguration,
    CertificateGenerationHistory,
    CertificateInvalidation,
    CertificateStatuses,
    CertificateWhitelist,
    GeneratedCertificate
)
from openedx.core.djangoapps.course_groups.cohorts import is_course_cohorted
from lms.djangoapps.grades.config.waffle import waffle_flags, WRITABLE_GRADEBOOK
from .tools import get_units_with_due_date, title_or_url

# Grade book: max students per page
MAX_STUDENTS_PER_PAGE_GRADE_BOOK = 20


def calculate_page_info(offset, total_students):
    """
    Takes care of sanitizing the offset of current page also calculates offsets for next and previous page
    and information like total number of pages and current page number.

    :param offset: offset for database query
    :return: tuple consist of page number, query offset for next and previous pages and valid offset
    """

    # validate offset.
    if not (isinstance(offset, int) or offset.isdigit()) or int(offset) < 0 or int(offset) >= total_students:
        offset = 0
    else:
        offset = int(offset)

    # calculate offsets for next and previous pages.
    next_offset = offset + MAX_STUDENTS_PER_PAGE_GRADE_BOOK
    previous_offset = offset - MAX_STUDENTS_PER_PAGE_GRADE_BOOK

    # calculate current page number.
    page_num = ((offset / MAX_STUDENTS_PER_PAGE_GRADE_BOOK) + 1)

    # calculate total number of pages.
    total_pages = int(math.ceil(float(total_students) / MAX_STUDENTS_PER_PAGE_GRADE_BOOK)) or 1

    if previous_offset < 0 or offset == 0:
        # We are at first page, so there's no previous page.
        previous_offset = None

    if next_offset >= total_students:
        # We've reached the last page, so there's no next page.
        next_offset = None

    return {
        "previous_offset": previous_offset,
        "next_offset": next_offset,
        "page_num": page_num,
        "offset": offset,
        "total_pages": total_pages
    }


def get_grade_book_page(request, course, course_key):
    """
    Get student records per page along with page information i.e current page, total pages and
    offset information.
    """
    # Unsanitized offset
    current_offset = request.GET.get('offset', 0)
    enrolled_students = User.objects.filter(
        courseenrollment__course_id=course_key,
        courseenrollment__is_active=1
    ).order_by('username').select_related("profile")

    total_students = enrolled_students.count()
    page = calculate_page_info(current_offset, total_students)
    offset = page["offset"]
    total_pages = page["total_pages"]

    if total_pages > 1:
        # Apply limit on queryset only if total number of students are greater then MAX_STUDENTS_PER_PAGE_GRADE_BOOK.
        enrolled_students = enrolled_students[offset: offset + MAX_STUDENTS_PER_PAGE_GRADE_BOOK]

    with modulestore().bulk_operations(course.location.course_key):
        student_info = [
            {
                'username': student.username,
                'id': student.id,
                'email': student.email,
                'grade_summary': CourseGradeFactory().read(student, course).summary
            }
            for student in enrolled_students
        ]
    return student_info, page


@transaction.non_atomic_requests
@cache_control(no_cache=True, no_store=True, must_revalidate=True)
@require_level('staff')
def spoc_gradebook(request, course_id):
    """
    Show the gradebook for this course:
    - Only shown for courses with enrollment < settings.FEATURES.get("MAX_ENROLLMENT_INSTR_BUTTONS")
    - Only displayed to course staff
    """
    course_key = CourseKey.from_string(course_id)
    course = get_course_with_access(request.user, 'staff', course_key, depth=None)
    student_info, page = get_grade_book_page(request, course, course_key)

    """ Display the instructor dashboard for a course. """
    try:
        course_key = CourseKey.from_string(course_id)
    except InvalidKeyError:
        log.error(u"Unable to find course with course key %s while loading the Instructor Dashboard.", course_id)
        return HttpResponseServerError()

    course = get_course_by_id(course_key, depth=0)

    access = {
        'admin': request.user.is_staff,
        'instructor': bool(has_access(request.user, 'instructor', course)),
        'finance_admin': CourseFinanceAdminRole(course_key).has_user(request.user),
        'sales_admin': CourseSalesAdminRole(course_key).has_user(request.user),
        'staff': bool(has_access(request.user, 'staff', course)),
        'forum_admin': has_forum_access(request.user, course_key, FORUM_ROLE_ADMINISTRATOR),
    }

    if not access['staff']:
        raise Http404()

    is_white_label = CourseMode.is_white_label(course_key)

    reports_enabled = configuration_helpers.get_value('SHOW_ECOMMERCE_REPORTS', False)

    sections = [
        _section_course_info(course, access),
        _section_membership(course, access),
        _section_cohort_management(course, access),
        _section_discussions_management(course, access),
        _section_student_admin(course, access),
        _section_data_download(course, access),
    ]

    analytics_dashboard_message = None
    if show_analytics_dashboard_message(course_key):
        # Construct a URL to the external analytics dashboard
        analytics_dashboard_url = '{0}/courses/{1}'.format(settings.ANALYTICS_DASHBOARD_URL, unicode(course_key))
        link_start = HTML("<a href=\"{}\" rel=\"noopener\" target=\"_blank\">").format(analytics_dashboard_url)
        analytics_dashboard_message = _(
            "To gain insights into student enrollment and participation {link_start}"
            "visit {analytics_dashboard_name}, our new course analytics product{link_end}."
        )
        analytics_dashboard_message = Text(analytics_dashboard_message).format(
            link_start=link_start, link_end=HTML("</a>"), analytics_dashboard_name=settings.ANALYTICS_DASHBOARD_NAME)

        # Temporarily show the "Analytics" section until we have a better way of linking to Insights
        sections.append(_section_analytics(course, access))

    # Check if there is corresponding entry in the CourseMode Table related to the Instructor Dashboard course
    course_mode_has_price = False
    paid_modes = CourseMode.paid_modes_for_course(course_key)
    if len(paid_modes) == 1:
        course_mode_has_price = True
    elif len(paid_modes) > 1:
        log.error(
            u"Course %s has %s course modes with payment options. Course must only have "
            u"one paid course mode to enable eCommerce options.",
            unicode(course_key), len(paid_modes)
        )

    if settings.FEATURES.get('INDIVIDUAL_DUE_DATES') and access['instructor']:
        sections.insert(3, _section_extensions(course))

    # Gate access to course email by feature flag & by course-specific authorization
    if BulkEmailFlag.feature_enabled(course_key):
        sections.append(_section_send_email(course, access))

    # Gate access to Metrics tab by featue flag and staff authorization
    if settings.FEATURES['CLASS_DASHBOARD'] and access['staff']:
        sections.append(_section_metrics(course, access))

    # Gate access to Ecommerce tab
    if course_mode_has_price and (access['finance_admin'] or access['sales_admin']):
        sections.append(_section_e_commerce(course, access, paid_modes[0], is_white_label, reports_enabled))

    # Gate access to Special Exam tab depending if either timed exams or proctored exams
    # are enabled in the course

    user_has_access = any([
        request.user.is_staff,
        CourseStaffRole(course_key).has_user(request.user),
        CourseInstructorRole(course_key).has_user(request.user)
    ])
    course_has_special_exams = course.enable_proctored_exams or course.enable_timed_exams
    can_see_special_exams = course_has_special_exams and user_has_access and settings.FEATURES.get(
        'ENABLE_SPECIAL_EXAMS', False)

    if can_see_special_exams:
        sections.append(_section_special_exams(course, access))

    # Certificates panel
    # This is used to generate example certificates
    # and enable self-generated certificates for a course.
    # Note: This is hidden for all CCXs
    certs_enabled = CertificateGenerationConfiguration.current().enabled and not hasattr(course_key, 'ccx')
    if certs_enabled and access['admin']:
        sections.append(_section_certificates(course))

    openassessment_blocks = modulestore().get_items(
        course_key, qualifiers={'category': 'openassessment'}
    )
    # filter out orphaned openassessment blocks
    openassessment_blocks = [
        block for block in openassessment_blocks if block.parent is not None
    ]
    if len(openassessment_blocks) > 0:
        sections.append(_section_open_response_assessment(request, course, openassessment_blocks, access))

    return render_to_response('courseware/gradebook.html', {
        'page': page,
        'page_url': reverse('spoc_gradebook', kwargs={'course_id': unicode(course_key)}),
        'students': student_info,
        'course': course,
        'course_id': course_key,
        # Checked above
        'staff_access': True,
        'ordered_grades': sorted(course.grade_cutoffs.items(), key=lambda i: i[1], reverse=True),
        'studio_url': get_studio_url(course, 'course'),
        'sections': sections,
        'instructor_url': reverse('instructor_dashboard', kwargs={'course_id': unicode(course_key)}),
    })


def _section_certificates(course):
    """Section information for the certificates panel.

    The certificates panel allows global staff to generate
    example certificates and enable self-generated certificates
    for a course.

    Arguments:
        course (Course)

    Returns:
        dict

    """
    example_cert_status = None
    html_cert_enabled = certs_api.has_html_certificates_enabled(course)
    if html_cert_enabled:
        can_enable_for_course = True
    else:
        example_cert_status = certs_api.example_certificates_status(course.id)

        # Allow the user to enable self-generated certificates for students
        # *only* once a set of example certificates has been successfully generated.
        # If certificates have been misconfigured for the course (for example, if
        # the PDF template hasn't been uploaded yet), then we don't want
        # to turn on self-generated certificates for students!
        can_enable_for_course = (
            example_cert_status is not None and
            all(
                cert_status['status'] == 'success'
                for cert_status in example_cert_status
            )
        )
    instructor_generation_enabled = settings.FEATURES.get('CERTIFICATES_INSTRUCTOR_GENERATION', False)
    certificate_statuses_with_count = {
        certificate['status']: certificate['count']
        for certificate in GeneratedCertificate.get_unique_statuses(course_key=course.id)
    }

    return {
        'section_key': 'certificates',
        'section_display_name': _('Certificates'),
        'example_certificate_status': example_cert_status,
        'can_enable_for_course': can_enable_for_course,
        'enabled_for_course': certs_api.cert_generation_enabled(course.id),
        'is_self_paced': course.self_paced,
        'instructor_generation_enabled': instructor_generation_enabled,
        'html_cert_enabled': html_cert_enabled,
        'active_certificate': certs_api.get_active_web_certificate(course),
        'certificate_statuses_with_count': certificate_statuses_with_count,
        'status': CertificateStatuses,
        'certificate_generation_history':
            CertificateGenerationHistory.objects.filter(course_id=course.id).order_by("-created"),
        'urls': {
            'generate_example_certificates': reverse(
                'generate_example_certificates',
                kwargs={'course_id': course.id}
            ),
            'enable_certificate_generation': reverse(
                'enable_certificate_generation',
                kwargs={'course_id': course.id}
            ),
            'start_certificate_generation': reverse(
                'start_certificate_generation',
                kwargs={'course_id': course.id}
            ),
            'start_certificate_regeneration': reverse(
                'start_certificate_regeneration',
                kwargs={'course_id': course.id}
            ),
            'list_instructor_tasks_url': reverse(
                'list_instructor_tasks',
                kwargs={'course_id': course.id}
            ),
        }
    }


def _section_course_info(course, access):
    """ Provide data for the corresponding dashboard section """
    course_key = course.id

    section_data = {
        'section_key': 'course_info',
        'section_display_name': _('Course Info'),
        'access': access,
        'course_id': course_key,
        'course_display_name': course.display_name_with_default,
        'course_org': course.display_org_with_default,
        'course_number': course.display_number_with_default,
        'has_started': course.has_started(),
        'has_ended': course.has_ended(),
        'start_date': course.start,
        'end_date': course.end,
        'num_sections': len(course.children),
        'list_instructor_tasks_url': reverse('list_instructor_tasks', kwargs={'course_id': unicode(course_key)}),
    }

    if settings.FEATURES.get('DISPLAY_ANALYTICS_ENROLLMENTS'):
        section_data['enrollment_count'] = CourseEnrollment.objects.enrollment_counts(course_key)

    if show_analytics_dashboard_message(course_key):
        #  dashboard_link is already made safe in _get_dashboard_link
        dashboard_link = _get_dashboard_link(course_key)
        #  so we can use Text() here so it's not double-escaped and rendering HTML on the front-end
        message = Text(_("Enrollment data is now available in {dashboard_link}.")).format(dashboard_link=dashboard_link)
        section_data['enrollment_message'] = message

    if settings.FEATURES.get('ENABLE_SYSADMIN_DASHBOARD'):
        section_data['detailed_gitlogs_url'] = reverse('gitlogs_detail', kwargs={'course_id': unicode(course_key)})

    try:
        sorted_cutoffs = sorted(course.grade_cutoffs.items(), key=lambda i: i[1], reverse=True)
        advance = lambda memo, (letter, score): "{}: {}, ".format(letter, score) + memo
        section_data['grade_cutoffs'] = reduce(advance, sorted_cutoffs, "")[:-2]
    except Exception:  # pylint: disable=broad-except
        section_data['grade_cutoffs'] = "Not Available"

    try:
        section_data['course_errors'] = [(escape(a), '') for (a, _unused) in modulestore().get_course_errors(course.id)]
    except Exception:  # pylint: disable=broad-except
        section_data['course_errors'] = [('Error fetching errors', '')]

    return section_data


def _section_special_exams(course, access):
    """ Provide data for the corresponding dashboard section """
    course_key = unicode(course.id)
    from edx_proctoring.api import is_backend_dashboard_available

    section_data = {
        'section_key': 'special_exams',
        'section_display_name': _('Special Exams'),
        'access': access,
        'course_id': course_key,
        'show_dashboard': is_backend_dashboard_available(course_key),
    }
    return section_data


def _section_membership(course, access):
    """ Provide data for the corresponding dashboard section """
    course_key = course.id
    ccx_enabled = settings.FEATURES.get('CUSTOM_COURSES_EDX', False) and course.enable_ccx
    enrollment_role_choices = configuration_helpers.get_value('MANUAL_ENROLLMENT_ROLE_CHOICES',
                                                              settings.MANUAL_ENROLLMENT_ROLE_CHOICES)

    section_data = {
        'section_key': 'membership',
        'section_display_name': _('Membership'),
        'access': access,
        'ccx_is_enabled': ccx_enabled,
        'enroll_button_url': reverse('students_update_enrollment', kwargs={'course_id': unicode(course_key)}),
        'unenroll_button_url': reverse('students_update_enrollment', kwargs={'course_id': unicode(course_key)}),
        'upload_student_csv_button_url': reverse('register_and_enroll_students', kwargs={'course_id': unicode(course_key)}),
        'modify_beta_testers_button_url': reverse('bulk_beta_modify_access', kwargs={'course_id': unicode(course_key)}),
        'list_course_role_members_url': reverse('list_course_role_members', kwargs={'course_id': unicode(course_key)}),
        'modify_access_url': reverse('modify_access', kwargs={'course_id': unicode(course_key)}),
        'list_forum_members_url': reverse('list_forum_members', kwargs={'course_id': unicode(course_key)}),
        'update_forum_role_membership_url': reverse('update_forum_role_membership', kwargs={'course_id': unicode(course_key)}),
        'enrollment_role_choices': enrollment_role_choices
    }
    return section_data


def _section_cohort_management(course, access):
    """ Provide data for the corresponding cohort management section """
    course_key = course.id
    ccx_enabled = hasattr(course_key, 'ccx')
    section_data = {
        'section_key': 'cohort_management',
        'section_display_name': _('Cohorts'),
        'access': access,
        'ccx_is_enabled': ccx_enabled,
        'course_cohort_settings_url': reverse(
            'course_cohort_settings',
            kwargs={'course_key_string': unicode(course_key)}
        ),
        'cohorts_url': reverse('cohorts', kwargs={'course_key_string': unicode(course_key)}),
        'upload_cohorts_csv_url': reverse('add_users_to_cohorts', kwargs={'course_id': unicode(course_key)}),
        'verified_track_cohorting_url': reverse(
            'verified_track_cohorting', kwargs={'course_key_string': unicode(course_key)}
        ),
    }
    return section_data


def _section_discussions_management(course, access):
    """ Provide data for the corresponding discussion management section """
    course_key = course.id
    enrollment_track_schemes = available_division_schemes(course_key)
    section_data = {
        'section_key': 'discussions_management',
        'section_display_name': _('Discussions'),
        'is_hidden': (not is_course_cohorted(course_key) and
                      CourseDiscussionSettings.ENROLLMENT_TRACK not in enrollment_track_schemes),
        'discussion_topics_url': reverse('discussion_topics', kwargs={'course_key_string': unicode(course_key)}),
        'course_discussion_settings': reverse(
            'course_discussions_settings',
            kwargs={'course_key_string': unicode(course_key)}
        ),
    }
    return section_data


def _is_small_course(course_key):
    """ Compares against MAX_ENROLLMENT_INSTR_BUTTONS to determine if course enrollment is considered small. """
    is_small_course = False
    enrollment_count = CourseEnrollment.objects.num_enrolled_in(course_key)
    max_enrollment_for_buttons = settings.FEATURES.get("MAX_ENROLLMENT_INSTR_BUTTONS")
    if max_enrollment_for_buttons is not None:
        is_small_course = enrollment_count <= max_enrollment_for_buttons
    return is_small_course


def _section_student_admin(course, access):
    """ Provide data for the corresponding dashboard section """
    course_key = course.id
    is_small_course = _is_small_course(course_key)

    section_data = {
        'section_key': 'student_admin',
        'section_display_name': _('Student Admin'),
        'access': access,
        'is_small_course': is_small_course,
        'get_student_enrollment_status_url': reverse(
            'get_student_enrollment_status',
            kwargs={'course_id': unicode(course_key)}
        ),
        'get_student_progress_url_url': reverse('get_student_progress_url', kwargs={'course_id': unicode(course_key)}),
        'enrollment_url': reverse('students_update_enrollment', kwargs={'course_id': unicode(course_key)}),
        'reset_student_attempts_url': reverse('reset_student_attempts', kwargs={'course_id': unicode(course_key)}),
        'reset_student_attempts_for_entrance_exam_url': reverse(
            'reset_student_attempts_for_entrance_exam',
            kwargs={'course_id': unicode(course_key)},
        ),
        'rescore_problem_url': reverse('rescore_problem', kwargs={'course_id': unicode(course_key)}),
        'override_problem_score_url': reverse('override_problem_score', kwargs={'course_id': unicode(course_key)}),
        'rescore_entrance_exam_url': reverse('rescore_entrance_exam', kwargs={'course_id': unicode(course_key)}),
        'student_can_skip_entrance_exam_url': reverse(
            'mark_student_can_skip_entrance_exam',
            kwargs={'course_id': unicode(course_key)},
        ),
        'list_instructor_tasks_url': reverse('list_instructor_tasks', kwargs={'course_id': unicode(course_key)}),
        'list_entrace_exam_instructor_tasks_url': reverse('list_entrance_exam_instructor_tasks',
                                                          kwargs={'course_id': unicode(course_key)}),
        'spoc_gradebook_url': reverse('spoc_gradebook', kwargs={'course_id': unicode(course_key)}),
    }
    if waffle_flags()[WRITABLE_GRADEBOOK].is_enabled(course_key) and settings.WRITABLE_GRADEBOOK_URL:
        section_data['writable_gradebook_url'] = urljoin(settings.WRITABLE_GRADEBOOK_URL, '/' + text_type(course_key))
    return section_data


def _section_extensions(course):
    """ Provide data for the corresponding dashboard section """
    section_data = {
        'section_key': 'extensions',
        'section_display_name': _('Extensions'),
        'units_with_due_dates': [(title_or_url(unit), unicode(unit.location))
                                 for unit in get_units_with_due_date(course)],
        'change_due_date_url': reverse('change_due_date', kwargs={'course_id': unicode(course.id)}),
        'reset_due_date_url': reverse('reset_due_date', kwargs={'course_id': unicode(course.id)}),
        'show_unit_extensions_url': reverse('show_unit_extensions', kwargs={'course_id': unicode(course.id)}),
        'show_student_extensions_url': reverse('show_student_extensions', kwargs={'course_id': unicode(course.id)}),
    }
    return section_data


def _section_data_download(course, access):
    """ Provide data for the corresponding dashboard section """
    course_key = course.id

    show_proctored_report_button = (
        settings.FEATURES.get('ENABLE_SPECIAL_EXAMS', False) and
        course.enable_proctored_exams
    )

    section_data = {
        'section_key': 'data_download',
        'section_display_name': _('Data Download'),
        'access': access,
        'show_generate_proctored_exam_report_button': show_proctored_report_button,
        'get_problem_responses_url': reverse('get_problem_responses', kwargs={'course_id': unicode(course_key)}),
        'get_grading_config_url': reverse('get_grading_config', kwargs={'course_id': unicode(course_key)}),
        'get_students_features_url': reverse('get_students_features', kwargs={'course_id': unicode(course_key)}),
        'get_issued_certificates_url': reverse(
            'get_issued_certificates', kwargs={'course_id': unicode(course_key)}
        ),
        'get_students_who_may_enroll_url': reverse(
            'get_students_who_may_enroll', kwargs={'course_id': unicode(course_key)}
        ),
        'get_anon_ids_url': reverse('get_anon_ids', kwargs={'course_id': unicode(course_key)}),
        'list_proctored_results_url': reverse('get_proctored_exam_results', kwargs={'course_id': unicode(course_key)}),
        'list_instructor_tasks_url': reverse('list_instructor_tasks', kwargs={'course_id': unicode(course_key)}),
        'list_report_downloads_url': reverse('list_report_downloads', kwargs={'course_id': unicode(course_key)}),
        'calculate_grades_csv_url': reverse('calculate_grades_csv', kwargs={'course_id': unicode(course_key)}),
        'problem_grade_report_url': reverse('problem_grade_report', kwargs={'course_id': unicode(course_key)}),
        'course_has_survey': True if course.course_survey_name else False,
        'course_survey_results_url': reverse('get_course_survey_results', kwargs={'course_id': unicode(course_key)}),
        'export_ora2_data_url': reverse('export_ora2_data', kwargs={'course_id': unicode(course_key)}),
    }
    return section_data


def show_analytics_dashboard_message(course_key):
    """
    Defines whether or not the analytics dashboard URL should be displayed.

    Arguments:
        course_key (CourseLocator): The course locator to display the analytics dashboard message on.
    """
    if hasattr(course_key, 'ccx'):
        ccx_analytics_enabled = settings.FEATURES.get('ENABLE_CCX_ANALYTICS_DASHBOARD_URL', False)
        return settings.ANALYTICS_DASHBOARD_URL and ccx_analytics_enabled

    return settings.ANALYTICS_DASHBOARD_URL