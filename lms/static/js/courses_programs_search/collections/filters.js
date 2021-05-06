(function(define) {
    define(['backbone', 'js/courses_programs_search/models/filter'], function(Backbone, Filter) {
        'use strict';

        return Backbone.Collection.extend({
            model: Filter,
            getTerms: function() {
                return this.reduce(function(terms, filter) {
                    // console.log(filter.get('query'));
                        terms[filter.id] = filter.get('query').map(function (query) {
                            if (query.key != "search_query") {
                                return query.key;
                            }
                        });
                        return terms;
                }, {});
            }
        });
    });
}(define || RequireJS.define));
