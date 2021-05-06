(function(define) {
    'use strict';

    define(['backbone', 'js/courses_programs_search/models/search_state', 'js/courses_programs_search/collections/filters',
        'js/courses_programs_search/views/search_form', 'js/courses_programs_search/views/courses_listing',
        'js/courses_programs_search/views/filter_bar', 'js/courses_programs_search/views/refine_sidebar',
        'js/courses_programs_search/models/url_search_params'],
        function(Backbone, SearchState, Filters, SearchForm, CoursesListing, FilterBar, RefineSidebar, UrlSearchParams) {
            return function(meanings, searchQuery, userLanguage, userTimezone) {
                var dispatcher = _.extend({}, Backbone.Events);
                var search = new SearchState();
                var filters = new Filters();
                filters.comparator = 'index';
                var form = new SearchForm();
                var filterBar = new FilterBar({collection: filters});
                var refineSidebar = new RefineSidebar({
                    collection: search.discovery.facetOptions,
                    meanings: meanings
                });
                var listing;
                var courseListingModel = search.discovery;
                var programListingModel = search.program;
                var urlSearchParams = new UrlSearchParams();
                onInit();
                
                $('#tab-search a').on('click.search', function(e) {
                    e.preventDefault();
                    var url = this.href;
                    var tab = $(this).data('tab-name');
                    var state = { 'tab': tab };
                    history.pushState(state, '', url);
                    listing.model = tab === 'discovery' ? courseListingModel : programListingModel;
                    search.searchingType = tab;
                    form.doSearch();
                    activateMenuTab($(this));
                });

                $('#pagination').pagination({
                    items: 100,
                    itemsOnPage: 10,
                    onPageClick(pageNumber, event){
                        // alert(pageNumber);
                        search.page = pageNumber - 1;
                        form.doSearch();
                    },
                    prevText: '<svg width="5" height="9"><use xlink:href="#paging-prev-icon"></use></svg>',
                    nextText: '<svg width="5" height="9"><use xlink:href="#paging-next-icon"></use></svg>'
                });

                window.onpopstate = function (event){
                    // todo
                    activateMenuTab($('#tab-search [data-tab-name=' + event.state.tab + ']'));

                    // console.log(event.state);

                    var params = {};

                    if (event.state.q) {
                        params.q = event.state.q;
                        $(form.$searchField).val(event.state.q);
                    }
                    
                    if (event.state.tab) {
                        params.tab = event.state.tab;
                    }
    
                    history.replaceState(params, '', '?' + urlSearchParams.objectToQuery(params));
                    form.doSearch();
                }

                courseListingModel.userPreferences = {
                    userLanguage: userLanguage,
                    userTimezone: userTimezone
                };

                programListingModel.userPreferences = {
                    userLanguage: userLanguage,
                    userTimezone: userTimezone
                };

                listing = new CoursesListing({model: courseListingModel});
                dispatcher.listenTo(form, 'search', function(query) {
                    filters.reset();
                    form.showLoadingIndicator();
                    search.performSearch(query, filters.getTerms());
                    // search.refineSearch(filters.getTerms());
                });

                dispatcher.listenTo(refineSidebar, 'selectOption', function(type, index, query) {
                    // console.log(search.searchTerm);
                    form.showLoadingIndicator();
                    if (filters.get(type)) {
                        removeFilter(type);
                    }
                    if (query) {
                        filters.add({type: type, query: query, index: index});
                    }
                    search.refineSearch(filters.getTerms());
                    // console.log(search.searchTerm);

                    // console.log(filters);
                });

                dispatcher.listenTo(filterBar, 'clearFilter', removeFilter);

                dispatcher.listenTo(filterBar, 'clearAll', function() {
                    form.doSearch();
                });

                dispatcher.listenTo(listing, 'next', function() {
                    search.loadNextPage();
                });

                dispatcher.listenTo(search, 'next', function() {
                    listing.renderNext();
                });

                dispatcher.listenTo(search, 'search', function(query, total) {
                    if (total > 0) {
                        form.showFoundMessage(total);
                        if (query) {
                            // filters.add(
                            //     {type: 'search_query', query: [{key: 'search_query', val: query}], name: quote(query)},
                            //     {merge: true}
                            // );
                        }
                    } else {
                        // form.showNotFoundMessage(query);
                        // filters.reset();
                        form.hideLoadingIndicator();
                    }
                    form.hideLoadingIndicator();
                    listing.render();
                    refineSidebar.render();
                    $('.page-title .title #records-count').text(listing.model.datafake.length + ' results');
                });

                dispatcher.listenTo(search, 'error', function() {
                    form.showErrorMessage(search.errorMessage);
                    form.hideLoadingIndicator();
                });

                // kick off search on page refresh
                // form.doSearch(searchQuery);

                function removeFilter(type, value = null) {
                    form.showLoadingIndicator();

                    if (value) {
                        var query = _.clone(filters.get(type).attributes.query)
                        var queryIndex = query.findIndex(function (item) { return item.key == value; });
                        if (queryIndex > -1) {
                            query.splice(queryIndex, 1);
                        }
                        if (!query.length) {
                            filters.remove(type);
                        } else {
                            filters.get(type).set({query: query});
                        }
                    } else {
                        filters.remove(type);
                    }

                    if (type === 'search_query') {
                        form.doSearch('');
                    } else {
                        search.refineSearch(filters.getTerms());
                    }
                }

                function quote(string) {
                    return '"' + string + '"';
                }

                function activateMenuTab(nav) {
                    $('#tab-search > ul > li').removeClass('active');
                    nav.parentsUntil('ul').addClass('active');
                    $('.page-title .title #main-title').text(nav.text());
                }


                var projects = [
                    {
                        title: 'Course',
                        records: [{
                            name: 'El cerebro y las emociones en el lenguaje',
                            org: 'URosarioX'
                        }, {
                            name: 'El arte de vender: introducción a las ventas',
                            org: 'JaverianaX'
                        }, {
                            name: 'Introducción a los encofrados y las cimbras en obra civil y edificación',
                            org: 'UPValenciaX'
                        }]
                    },
                    {
                        title: 'Programs',
                        records: [{
                            name: 'History of China: Bronze Age to the last Dynasties',
                            org: 'HarvardX'
                        }, {
                            name: 'Internet de las cosas (IoT), Big Data y sus aplicaciones',
                            org: 'URosarioX'
                        }, {
                            name: 'Fundamentos de Microsoft Office para la empresa',
                            org: 'UPValenciaX'
                        }]
                    }
                ];

                $('#discovery-input').on('input', function() {
                    onSearchSuggestions();
                });

                $('#discovery-input').on('keydown', function(e) {
                    if ([38, 40].includes(e.keyCode)) {
                        onSearchSuggestions();
                    } else if ([27, 13].includes(e.keyCode)) {
                        onCloseSearchSuggestions();
                    }
                });

                $('#view-all-results-button').on('click', function() {
                    onViewAllSearchResults();
                });

                $(document).on('click', function() {
                    onCloseSearchSuggestions();
                });
                  
                $('#discovery-form').on('click', function(event){
                    event.stopPropagation();
                });

                function onCloseSearchSuggestions() {
                    $('#search-suggestions > .search-suggestions-container').empty();
                    $('#search-suggestions').hide();
                }

                function onSearchSuggestions() {
                    var text = $('#discovery-input').val();
                    
                    var itemEl = $('<div class="records-wrapper">');
                    projects.forEach(function (item) {
                        itemEl.append('<h3>' + item.title + '</h3>');
                        var ulEl = $('<ul>');
                        item.records.forEach(function (record) {
                            ulEl.append('<li><a href="#">' + record.name + '<span class="badge">' + record.org + '</span></a></li>');
                        });
                        ulEl.appendTo(itemEl);
                    });

                    $('#search-suggestions > .search-suggestions-container').empty().append(itemEl);
                    $('#search-suggestions').show();
                }

                function onViewAllSearchResults() {
                    form.doSearch();
                    onCloseSearchSuggestions();
                }

                function onInit() {
                    var params = {};
                    var urlParams = urlSearchParams.queryToObject();
                    var tab = urlParams.tab;
                    var q = urlParams.q;
                    activateMenuTab($('#tab-search a[href^="' + (tab ? ('?tab=' + tab) : '/' + location.pathname.split("/")[1]) + '"]'));

                    if (q) {
                        params.q = q;
                        setTimeout(() => {
                            $(form.$searchField).val(q);
                        });
                    }

                    if (tab) {
                        params.tab = tab;
                    }
    
                    history.pushState(params, '', Object.keys(params).length ? (urlSearchParams.objectToQuery(params) ? '?' + urlSearchParams.objectToQuery(params) : '') : '/search');
                    setTimeout(() => {
                        form.doSearch();
                    });
                }
            };
        });
}(define || RequireJS.define));
