(function(define) {
    define(['backbone'], function(Backbone) {
        'use strict';

        return Backbone.Model.extend({
            idAttribute: 'type',
            defaults: {
                type: 'search_query',
                query: {},
            }
        });
    });
}(define || RequireJS.define));
