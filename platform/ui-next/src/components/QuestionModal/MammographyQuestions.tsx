import { Select } from '@radix-ui/react-select';
import React from 'react';
import { SelectContent, SelectItem, SelectTrigger, SelectValue } from '../Select';

const breastDensityOptions = ['A', 'B', 'C', 'D'];
const definitionOptions = ['Normal', 'AbNormal'];
const massOptions = ['Begin', 'Suspicpius'];
const microlcalcificationOptions = ['Begin', 'Suspicpius'];
const asymmetryOptions = ['Focal', 'Global', 'Developing'];
const yesNoOptions = ['Yes', 'No'];
const biRadsOptions = ['0', '1 or 2', '4 or 5'];

const labelClass = 'text-primary-light text-base';
const radioLabelClass = 'flex items-center gap-0 text-base cursor-pointer text-white relative';
const selectClass =
  'w-full rounded border border-[#6B6C6E] bg-gray-900 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white';
const errorClass = 'text-sm text-[#FF2768] mt-1';
const sectionClass = 'mb-4';

export interface MammographyQuestionsProps {
  form: any;
  errors: { [key: string]: string };
  handleChange: (field: string, value: string) => void;
}

const MammographyQuestions: React.FC<MammographyQuestionsProps> = ({
  form,
  errors,
  handleChange,
}) => (
  <>
    {/* Breast Density */}
    <div className={sectionClass}>
      <label className={labelClass}>Breast Density</label>
      <div className="mt-1.5 flex gap-6">
        {breastDensityOptions.map((opt, index) => (
          <div
            key={opt}
            className={radioLabelClass}
          >
            <input
              id={`breastDensity-${index}`}
              type="radio"
              name="breastDensity"
              value={opt}
              checked={form.breastDensity === opt}
              onChange={e => handleChange('breastDensity', e.target.value)}
              className="accent-white"
            />
            <label htmlFor={`breastDensity-${index}`}></label>
            {opt}
          </div>
        ))}
      </div>
      {errors.breastDensity && <span className={errorClass}>{errors.breastDensity}</span>}
    </div>

    {/* Definition */}
    <div className={sectionClass}>
      <label className={labelClass}>Definition</label>
      <div className="mt-2 flex gap-6">
        {definitionOptions.map((opt, index) => (
          <div
            key={opt}
            className={radioLabelClass}
          >
            <input
              id={`definition-${index}`}
              type="radio"
              name="definition"
              value={opt}
              checked={form.definition === opt}
              onChange={e => handleChange('definition', e.target.value)}
              className="accent-white"
            />
            <label htmlFor={`definition-${index}`}></label>
            {opt}
          </div>
        ))}
      </div>
      {errors.definition && <span className={errorClass}>{errors.definition}</span>}
    </div>

    {/* Conditional fields if AbNormal */}
    {form.definition === 'AbNormal' && (
      <>
        {/* Mass */}
        <div className={sectionClass}>
          <label className={labelClass}>Mass</label>
          {/* <select
            value={form.mass}
            onChange={e => handleChange('mass', e.target.value)}
            className={selectClass}
          >
            <option value="">Select</option>
            {massOptions.map(opt => (
              <option
                key={opt}
                value={opt}
              >
                {opt}
              </option>
            ))}
          </select> */}
          <Select
            value={form.mass}
            onValueChange={value => handleChange('mass', value)}
          >
            <SelectTrigger
              className="w-full"
              style={{
                borderRadius: '8px',
                border: '1px solid #4F4F4F',
                boxShadow: '0 1px 2px 0 rgba(10, 13, 18, 0.05)',
              }}
            >
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {massOptions.map(option => (
                <SelectItem
                  key={option}
                  value={option}
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.mass && <span className={errorClass}>{errors.mass}</span>}
        </div>
        {/* Microlcalcification */}
        <div className={sectionClass}>
          <label className={labelClass}>Microlcalcification</label>
          {/* <select
            value={form.microlcalcification}
            onChange={e => handleChange('microlcalcification', e.target.value)}
            className={selectClass}
          >
            <option value="">Select</option>
            {microlcalcificationOptions.map(opt => (
              <option
                key={opt}
                value={opt}
              >
                {opt}
              </option>
            ))}
          </select> */}

          <Select
            value={form.microlcalcification}
            onValueChange={value => handleChange('microlcalcification', value)}
          >
            <SelectTrigger
              className="w-full"
              style={{
                borderRadius: '8px',
                border: '1px solid #4F4F4F',
                boxShadow: '0 1px 2px 0 rgba(10, 13, 18, 0.05)',
              }}
            >
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {microlcalcificationOptions.map(option => (
                <SelectItem
                  key={option}
                  value={option}
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.microlcalcification && (
            <span className={errorClass}>{errors.microlcalcification}</span>
          )}
        </div>
        {/* Asymmetry */}
        <div className={sectionClass}>
          <label className={labelClass}>Asymmetry</label>
          {/* <select
            value={form.asymmetry}
            onChange={e => handleChange('asymmetry', e.target.value)}
            className={selectClass}
          >
            <option value="">Select</option>
            {asymmetryOptions.map(opt => (
              <option
                key={opt}
                value={opt}
              >
                {opt}
              </option>
            ))}
          </select> */}
          <Select
            value={form.asymmetry}
            onValueChange={value => handleChange('asymmetry', value)}
          >
            <SelectTrigger
              className="w-full"
              style={{
                borderRadius: '8px',
                border: '1px solid #4F4F4F',
                boxShadow: '0 1px 2px 0 rgba(10, 13, 18, 0.05)',
              }}
            >
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {asymmetryOptions.map(option => (
                <SelectItem
                  key={option}
                  value={option}
                >
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.asymmetry && <span className={errorClass}>{errors.asymmetry}</span>}
        </div>
        {/* Architectural Distortion */}
        <div className={sectionClass}>
          <label className={labelClass}>Architectural Distortion</label>
          <div className="mt-2 flex gap-6">
            {yesNoOptions.map((opt, index) => (
              <div
                key={opt}
                className={radioLabelClass}
              >
                <input
                  id={`architecturalDistortion-${index}`}
                  type="radio"
                  name="architecturalDistortion"
                  value={opt}
                  checked={form.architecturalDistortion === opt}
                  onChange={e => handleChange('architecturalDistortion', e.target.value)}
                  className="accent-white"
                />
                <label htmlFor={`architecturalDistortion-${index}`}></label>
                {opt}
              </div>
            ))}
          </div>
          {errors.architecturalDistortion && (
            <span className={errorClass}>{errors.architecturalDistortion}</span>
          )}
        </div>
        {/* Associated Abnormality */}
        <div className={sectionClass}>
          <label className="mb-4 block w-full border-b border-[#4F4F4F] pb-2 text-base font-bold text-white">
            Associated Abnormality
          </label>
          <div className="ml-0 space-y-2">
            <div>
              <label className={labelClass + ' text-sm'}>Skin</label>
              <div className="mt-2 flex gap-6">
                {yesNoOptions.map((opt, index) => (
                  <div
                    key={opt}
                    className={radioLabelClass}
                  >
                    <input
                      id={`associatedAbnormalitySkin-${index}`}
                      type="radio"
                      name="associatedAbnormalitySkin"
                      value={opt}
                      checked={form.associatedAbnormalitySkin === opt}
                      onChange={e => handleChange('associatedAbnormalitySkin', e.target.value)}
                      className="accent-white"
                    />
                    <label htmlFor={`associatedAbnormalitySkin-${index}`}></label>
                    {opt}
                  </div>
                ))}
              </div>
              {errors.associatedAbnormalitySkin && (
                <span className={errorClass}>{errors.associatedAbnormalitySkin}</span>
              )}
            </div>
            <div>
              <label className={labelClass + ' text-sm'}>Nipple</label>
              <div className="mt-2 flex gap-6">
                {yesNoOptions.map((opt, index) => (
                  <label
                    key={opt}
                    className={radioLabelClass}
                  >
                    <input
                      id={`associatedAbnormalityNipple-${index}`}
                      type="radio"
                      name="associatedAbnormalityNipple"
                      value={opt}
                      checked={form.associatedAbnormalityNipple === opt}
                      onChange={e => handleChange('associatedAbnormalityNipple', e.target.value)}
                      className="accent-white"
                    />
                    <label htmlFor={`associatedAbnormalityNipple-${index}`}></label>
                    {opt}
                  </label>
                ))}
              </div>
              {errors.associatedAbnormalityNipple && (
                <span className={errorClass}>{errors.associatedAbnormalityNipple}</span>
              )}
            </div>
            <div>
              <label className={labelClass + ' text-sm'}>Lymph Node</label>
              <div className="mt-2 flex gap-6">
                {yesNoOptions.map((opt, index) => (
                  <label
                    key={opt}
                    className={radioLabelClass}
                  >
                    <input
                      id={`associatedAbnormalityLymphNode-${index}`}
                      type="radio"
                      name="associatedAbnormalityLymphNode"
                      value={opt}
                      checked={form.associatedAbnormalityLymphNode === opt}
                      onChange={e => handleChange('associatedAbnormalityLymphNode', e.target.value)}
                      className="accent-white"
                    />
                    <label htmlFor={`associatedAbnormalityLymphNode-${index}`}></label>
                    {opt}
                  </label>
                ))}
              </div>
              {errors.associatedAbnormalityLymphNode && (
                <span className={errorClass}>{errors.associatedAbnormalityLymphNode}</span>
              )}
            </div>
          </div>
        </div>
      </>
    )}

    {/* Bi-RADS */}
    <div className={sectionClass}>
      <label className={labelClass}>Bi-RADS</label>
      <div className="mt-2 flex gap-6">
        {biRadsOptions.map((opt, index) => (
          <div
            key={opt}
            className={radioLabelClass}
          >
            <input
              id={`biRads-${index}`}
              type="radio"
              name="biRads"
              value={opt}
              checked={form.biRads === opt}
              onChange={e => handleChange('biRads', e.target.value)}
              className="accent-white"
            />

            <label htmlFor={`biRads-${index}`}></label>
            {opt}
          </div>
        ))}
      </div>
      {errors.biRads && <span className={errorClass}>{errors.biRads}</span>}
    </div>

    {/* Remarks/Notes */}
    <div className={sectionClass}>
      <label className={labelClass}>Remarks/Notes</label>
      <textarea
        value={form.remarks}
        onChange={e => handleChange('remarks', e.target.value)}
        className="mt-1.5 w-full resize-none rounded-lg border border-[#4F4F4F] bg-transparent px-3 py-3 text-white focus:outline-none focus:ring-0 focus:ring-white"
        rows={3}
        placeholder="Enter remarks or notes"
        style={{ fontFamily: 'inherit', fontSize: '1rem' }}
      />
    </div>
  </>
);

export default MammographyQuestions;
