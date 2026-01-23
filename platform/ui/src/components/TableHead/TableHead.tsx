import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

const TableHead = ({ children, className = '', style = {} }) => {
  return (
    <div
      className={classnames(
        'bg-secondary-dark flex border-b border-white/10 pr-2 pb-2 font-medium text-white',
        className
      )}
      style={style}
    >
      {React.isValidElement(children)
        ? React.cloneElement(children, {
            isTableHead: true,
          })
        : children}
    </div>
  );
};

TableHead.propTypes = {
  children: function (props, propName, componentName) {
    const elements = React.Children.toArray(props.children);
    const isString = elements.some(child => typeof child === 'string');

    if (isString) {
      return new Error(
        `Failed prop type: Invalid prop ${propName} supplied to ${componentName}, expected a valid element instead of a string.`
      );
    }

    const isInvalidElement = elements.some(child => !React.isValidElement(child));

    if (isInvalidElement) {
      return new Error(
        `Failed prop type: Invalid prop ${propName} supplied to ${componentName}, expected a valid node element.`
      );
    }
  },
  className: PropTypes.string,
  style: PropTypes.object,
};

export default TableHead;
