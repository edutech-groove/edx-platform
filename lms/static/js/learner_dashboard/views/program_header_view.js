import Backbone from 'backbone';

import HtmlUtils from 'edx-ui-toolkit/js/utils/html-utils';

import pageTpl from '../../../templates/learner_dashboard/program_header_view.underscore';
import MicroMastersLogo from '../../../images/programs/micromasters-program-details.svg';
import XSeriesLogo from '../../../images/programs/xseries-program-details.svg';
import ProfessionalCertificateLogo from '../../../images/programs/professional-certificate-program-details.svg';

class ProgramHeaderView extends Backbone.View {
  constructor(options) {
    const defaults = {
      el: '.js-program-header',
    };
    super(Object.assign({}, defaults, options));
  }

  initialize() {
    this.breakpoints = {
      min: {
        medium: '768px',
        large: '1180px',
      },
    };
    this.tpl = HtmlUtils.template(pageTpl);
    this.render();
  }

  render() {
    const data = $.extend(this.model.toJSON(), {
      breakpoints: this.breakpoints
    });

    if (this.model.get('programData')) {
      HtmlUtils.setHtml(this.$el, this.tpl(data));
    }
  }
}

export default ProgramHeaderView;
