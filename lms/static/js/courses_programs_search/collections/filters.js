(function(define) {
    define(['backbone', 'js/courses_programs_search/models/filter'], function(Backbone, Filter) {
        'use strict';

        return Backbone.Collection.extend({
            model: Filter,
            getTerms: function() {
                // console.log(this);
                return this.reduce(function(terms, filter) {
                    // console.log(terms, filter);
                    terms[filter.id] = filter.get('query');
                    // console.log(filter.get('query'), terms);
                    return terms;
                }, {});
            }
        });
    });
}(define || RequireJS.define));
