import os
from decouple import config

ENVIRONMENT = config('DJANGO_ENVIRONMENT', default='development')

if ENVIRONMENT == 'production':
    from .production import *  # noqa: F401, F403
else:
    from .development import *  # noqa: F401, F403
