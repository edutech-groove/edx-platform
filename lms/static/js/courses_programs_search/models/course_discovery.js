(function(define) {
    define([
        'underscore',
        'backbone',
        'js/courses_programs_search/models/course_card',
        'js/courses_programs_search/models/facet_option'
    ], function(_, Backbone, CourseCard, FacetOption) {
        'use strict';

        return Backbone.Model.extend({
            
            url: null,
            jqhxr: null,
            courses: {
                totalCount: 0,
                latestCount: 0
            },
            programs: {
                totalCount: 0,
                latestCount: 0
            },
            type: 'courses',

            initialize: function(type = 'courses') {
                this.type = type;
                this.programs.courseCards = new Backbone.Collection([], {model: CourseCard});
                this.courses.courseCards = new Backbone.Collection([], {model: CourseCard});
                
                this.facetOptions = new Backbone.Collection([], {model: FacetOption});
            },

            update: function(searchingType) {
                this.type = searchingType || 'all';

                if (this.type === 'programs') {
                    this.url = '/search/program_discovery/';
                } else if (this.type === 'courses') {
                    this.url = '/search/course_discovery/';
                } else if (this.type === 'all') {
                    this.url = '/search/course_discovery/';
                }
            },

            parse: function(response) {
                var courses = response.results || [];
                var facets = response.facets || {};

                this.reset();
                if (['all', 'programs'].includes(this.type)) {
                    this.programs.courseCards.add(courses);
                    this.set({
                        programs:{
                            totalCount: response.results.length ? response.results[0].count : 0,
                            latestCount: courses.length
                        }
                    });
                }
                if (['all', 'courses'].includes(this.type)) {
                    this.courses.courseCards.add(_.pluck(courses, 'data'));
                    this.set({
                        courses:{
                            totalCount: response.total,
                            latestCount: courses.length
                        }
                    });
                }

                this.facetOptions.reset();

                var _this = this;
                _(facets).each(function(obj, key) {
                    _(obj.terms).each(function(count, term) {
                        _this.facetOptions.add({
                            facet: key,
                            term: term,
                            count: count
                        }, {merge: true});
                    });
                });
            },

            reset: function() {
                this.set({
                    courses:{
                        totalCount: 0,
                        latestCount: 0
                    },
                    programs:{
                        totalCount: 0,
                        latestCount: 0
                    }
                });

                if (['all', 'programs'].includes(this.type)) {
                    this.programs.courseCards.reset();
                }
                if (['all', 'courses'].includes(this.type)) {
                    this.courses.courseCards.reset();
                }

                this.facetOptions.reset();
            },

            totalcount: function() {
                if (this.type === 'all') {
                    return 0; //temp
                }
                return this.get(this.type).totalCount;
            },

            latest: function() {
                if (this.type === 'all') {
                    return {
                        courses: this.courses.courseCards.last(this.get('courses').latestCount),
                        programs: this.programs.courseCards.last(this.get('programs').latestCount)
                    }
                } else {
                    return {
                        [this.type]: this[this.type].courseCards.last(this.get(this.type).latestCount)
                    };
                }
            }

        });
    });
}(define || RequireJS.define));
