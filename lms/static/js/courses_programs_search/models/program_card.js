(function(define) {
    define(['backbone'], function(Backbone) {
        'use strict';

        return Backbone.Model.extend({
            defaults: {
                uuid: '',
                type: '',
                title: '',
                status: '',
                marketing_slug: '',
                subtitle: ''
            }
        });
    });
}(define || RequireJS.define));
