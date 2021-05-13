"""
Custom static page views
"""
from django.conf import settings
from django.template.context_processors import csrf
from django.urls import reverse
from django.utils.http import urlquote_plus
from django.shortcuts import redirect
from django.views.decorators.clickjacking import xframe_options_deny
from django.views.decorators.csrf import ensure_csrf_cookie

from edxmako.shortcuts import render_to_response
from openedx.core.djangoapps.external_auth.views import redirect_with_get, ssl_get_cert_from_request, ssl_login_shortcut
from openedx.core.djangoapps.site_configuration import helpers as configuration_helpers
from waffle.decorators import waffle_switch
from contentstore.config import waffle

__all__ = ['about', 'faq', 'tos', 'honor', 'privacy', 'contact']


@ssl_login_shortcut
@ensure_csrf_cookie
@xframe_options_deny

def about(request):
    "About view"
    return render_to_response('about.html', {})

def faq(request):
    "FAQ view"
    return render_to_response('faq.html', {})

def tos(request):
    "Tos view"
    return render_to_response('tos.html', {})

def honor(request):
    "Honor view"
    return render_to_response('honor.html', {})

def privacy(request):
    "Privacy view"
    return render_to_response('privacy.html', {})

def contact(request):
    "Contact view"
    return render_to_response('contact.html', {})