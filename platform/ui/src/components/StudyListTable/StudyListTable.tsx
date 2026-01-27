import React from 'react';
import PropTypes from 'prop-types';

import StudyListTableRow from './StudyListTableRow';

const StudyListTable = ({ tableDataSource, querying }) => {
  return (
    <div className="bg-black">
      <div className="container relative m-auto max-w-[1170px]">
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full min-w-[720px] border-collapse text-[14px] text-white">
            <tbody
              data-cy="study-list-results"
              data-querying={querying}
            >
              {tableDataSource.map((tableData, i) => {
                return (
                  <StudyListTableRow
                    tableData={tableData}
                    key={i}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

StudyListTable.propTypes = {
  tableDataSource: PropTypes.arrayOf(
    PropTypes.shape({
      row: PropTypes.array.isRequired,
      expandedContent: PropTypes.node.isRequired,
      querying: PropTypes.bool,
      onClickRow: PropTypes.func.isRequired,
      isExpanded: PropTypes.bool.isRequired,
    })
  ),
};

export default StudyListTable;
