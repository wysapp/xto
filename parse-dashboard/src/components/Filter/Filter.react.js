

import * as Filters from 'lib/Filters';
import { List, Map } from 'immutable';
import PropTypes from 'lib/PropTypes';
import React from 'react';



function changeField(schema, filters, index, newField) {

  
  let newFilter = new Map({
    field: newField,
    constraint: Filters.FieldConstraints[schema[newField].type][0],
    compareTo: Filters.DefaultComparisons[schema[newField].type]
  });
  return filters.set(index, newField);
}

let Filter = ({schema, filters, renderRow, onChange, blacklist}) => {
  blacklist = blacklist || [];
  let available = Filters.availableFilters(schema, filters);

  return (
    <div>
      {filters.toArray().map((filter, i) => {
        let field = filter.get('field');
        let constraint = filter.get('constraint');
        let compareTo = filter.get('compareTo');

        let fields = Object.keys(available).concat([]);
        if (fields.indexOf(field) < 0) {
          fields.push(field);
        }

        fields.sort();
        let constraints = Filters.FieldConstraints[schema[field].type].filter((c) => blacklist.indexOf(c) < 0);

        let compareType = schema[field].type;
        if (Filters.Constraints[constraint].hasOwnProperty('field')) {
          compareType = Filters.Constraints[constraint].field;
        }

        return renderRow({
          fields,
          constraints,
          compareInfo: {
            type: compareType,
            targetClass: schema[field].targetClass,
          },
          currentField: field,
          currentConstraint: constraint,
          compareTo,
          key: field + '-' + constraint + '-' + i,

          onChangeField: newField => {
            onChange(changeField(schema, filters, i, newField));
          },

          onChangeConstraint: newConstraint => {
            onChange(chnageConstraint(schema, filters, i, newConstraint));
          },
          onChangeCompareTo: newCompare => {
            onChange(changeCompareTo(schema, filters, i, compareType, newCompare));
          },
          onDeleteRow: () => {
            onChange(deleteRow(filters, i));
          }
        });
      })}
    </div>
  );
};


export default Filter;

Filter.propTypes = {
  schema: PropTypes.object.isRequired.describe(
    'A class schema, mapping field names to their Type strings'
  ),
  filters: PropTypes.instanceOf(List).isRequired.describe(
    'An array of filter objects. Each filter contains "field", "comparator", and "compareTo" fields.'
  ),
  renderRow: PropTypes.func.isRequired.describe(
    'A function for rendering a row of a filter.'
  )
};
