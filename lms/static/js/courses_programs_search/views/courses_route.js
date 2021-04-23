(function(define) {
    define([
        'jquery',
        'underscore',
        'backbone',
        'gettext',
    ], function($, _, Backbone, gettext) {
        'use strict';

        return Backbone.View.extend({

            events: {
                'click .tab-courses': 'changePage'
            },

            changePage: function (event) {
                console.log("8888888888");
            }
        });
});
}(define || RequireJS.define));