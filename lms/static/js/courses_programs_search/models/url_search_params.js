(function(define) {
    define(['backbone'], function(Backbone) {
        'use strict';

        return Backbone.Model.extend({
            QUERY_SEARCH_PATTERN: /([^&=]+)=?([^&|#]*)/g,

            initialize: function() {
            },

            queryToObject: function (queryString = location.search) {
                const params = {};
                let match;
                queryString = queryString.includes('?') ? queryString.replace(/.*\?/, '') : '';
                while (match = this.QUERY_SEARCH_PATTERN.exec(queryString)) {
                    var key = decodeURIComponent(match[1]);
                    var val = decodeURIComponent(match[2]);

                    if (params[key]) {
                        if (!(params[key] instanceof Array)) {
                            params[key] = [params[key]];
                        }
                        params[key].push(val);

                    } else {
                        params[key] = val;
                    }
                }
                return params;
            },
            
            objectToQuery: function (params = {}) {
                let queries = [];
                for (let name in params) {
                    if (params.hasOwnProperty(name) && params[name] !== '') {
                        if (params[name] instanceof Array) {
                            for (let index in params[name]) {
                                queries.push(encodeURIComponent(name) + '=' + encodeURIComponent(params[name][index]));
                            }

                        } else {
                            queries.push(encodeURIComponent(name) + '=' + encodeURIComponent(params[name]));
                        }
                    }
                }
                return queries.join('&');
            }

        });
    });
}(define || RequireJS.define));
