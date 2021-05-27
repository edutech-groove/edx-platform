function playVideo(src) {
    'use strict';
    var embedUrl = getEmbedUrl(src);
    if (embedUrl) {
        document.querySelector('#program_video button').style = 'display:none;';
        document.querySelector('#program_video #embed-video').style = 'display:block;';
        document.querySelector('#program_video #embed-video iframe').src = embedUrl;
    }
}
$('.instructor-image, .instructor-label').leanModal({closeButton: '.modal_close', top: '10%'});
// Create MutationObserver which prevents the body of
// the page from scrolling when a modal window is displayed
var observer = new MutationObserver(function(mutations, obv) {
    mutations.forEach(function(mutation) {
        if ($(mutation.target).css('display') === 'block') {
            $('body').css('overflow', 'hidden');
        } else {
            $('body').css('overflow', 'auto');
        }
    });
});
$('.modal').each(function(index, element) {
    observer.observe(element, {attributes: true, attributeFilter: ['style']});
});

$('.accordion .header').on('click', function(e) {
    var accordion = $(e.target).closest('.accordion');
    accordion.toggleClass('open');

    if (accordion.hasClass('open')) {
        accordion.find('.body').slideDown();

        if (accordion.hasClass('instructors')) {
            accordion.find('.status-icon.plus').hide();
            accordion.find('.status-icon.minus').show();
        }
    } else {
        accordion.find('.body').slideUp();

        if (accordion.hasClass('instructors')) {
            accordion.find('.status-icon.minus').hide();
            accordion.find('.status-icon.plus').show();
        }
    }
});

function getEmbedUrl(url) {    
    if (url != undefined || url != '') {        
        var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\?v=)([^#\&\?]*).*/;
        var match = url.match(regExp);
        if (match && match[2].length == 11) {
            return 'https://www.youtube.com/embed/' + match[2];
        } else {
            return url;
        }
    }
    return null;
}