# Generated by Django 2.2.16 on 2020-11-06 21:29

from django.db import migrations, models
import lms.djangoapps.verify_student.models


class Migration(migrations.Migration):

    dependencies = [
        ('verify_student', '0012_sspverificationretryconfig'),
    ]

    operations = [
        migrations.AddField(
            model_name='manualverification',
            name='expiration_date',
            field=models.DateTimeField(blank=True, db_index=True, default=lms.djangoapps.verify_student.models.IDVerificationAttempt.expiration_default, null=True),
        ),
        migrations.AddField(
            model_name='softwaresecurephotoverification',
            name='expiration_date',
            field=models.DateTimeField(blank=True, db_index=True, default=lms.djangoapps.verify_student.models.IDVerificationAttempt.expiration_default, null=True),
        ),
        migrations.AddField(
            model_name='ssoverification',
            name='expiration_date',
            field=models.DateTimeField(blank=True, db_index=True, default=lms.djangoapps.verify_student.models.IDVerificationAttempt.expiration_default, null=True),
        ),
    ]
