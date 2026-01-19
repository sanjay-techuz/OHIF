import React from 'react';

const breastDensityOptions = ['A', 'B', 'C', 'D'];
const definitionOptions = ['Normal', 'AbNormal'];
const massOptions = ['Begin', 'Suspicpius'];
const microlcalcificationOptions = ['Begin', 'Suspicpius'];
const asymmetryOptions = ['Focal', 'Global', 'Developing'];
const yesNoOptions = ['Yes', 'No'];
const biRadsOptions = ['0', '1 or 2', '4 or 5'];

const labelClass = 'block mb-1 text-base font-semibold text-white font-sans tracking-wide';
const radioLabelClass = 'flex items-center gap-2 text-sm font-medium text-gray-200 font-sans';
const selectClass =
  'w-full rounded border border-[#6B6C6E] bg-gray-900 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white';
const errorClass = 'text-xs text-red-400 mt-1 font-sans';
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
      <div className="mt-2 flex gap-6">
        {breastDensityOptions.map(opt => (
          <label
            key={opt}
            className={radioLabelClass}
          >
            <input
              type="radio"
              name="breastDensity"
              value={opt}
              checked={form.breastDensity === opt}
              onChange={e => handleChange('breastDensity', e.target.value)}
              className="accent-white"
            />
            {opt}
          </label>
        ))}
      </div>
      {errors.breastDensity && <span className={errorClass}>{errors.breastDensity}</span>}
    </div>

    {/* Definition */}
    <div className={sectionClass}>
      <label className={labelClass}>Definition</label>
      <div className="mt-2 flex gap-6">
        {definitionOptions.map(opt => (
          <label
            key={opt}
            className={radioLabelClass}
          >
            <input
              type="radio"
              name="definition"
              value={opt}
              checked={form.definition === opt}
              onChange={e => handleChange('definition', e.target.value)}
              className="accent-white"
            />
            {opt}
          </label>
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
          <select
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
          </select>
          {errors.mass && <span className={errorClass}>{errors.mass}</span>}
        </div>
        {/* Microlcalcification */}
        <div className={sectionClass}>
          <label className={labelClass}>Microlcalcification</label>
          <select
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
          </select>
          {errors.microlcalcification && (
            <span className={errorClass}>{errors.microlcalcification}</span>
          )}
        </div>
        {/* Asymmetry */}
        <div className={sectionClass}>
          <label className={labelClass}>Asymmetry</label>
          <select
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
          </select>
          {errors.asymmetry && <span className={errorClass}>{errors.asymmetry}</span>}
        </div>
        {/* Architectural Distortion */}
        <div className={sectionClass}>
          <label className={labelClass}>Architectural Distortion</label>
          <div className="mt-2 flex gap-6">
            {yesNoOptions.map(opt => (
              <label
                key={opt}
                className={radioLabelClass}
              >
                <input
                  type="radio"
                  name="architecturalDistortion"
                  value={opt}
                  checked={form.architecturalDistortion === opt}
                  onChange={e => handleChange('architecturalDistortion', e.target.value)}
                  className="accent-white"
                />
                {opt}
              </label>
            ))}
          </div>
          {errors.architecturalDistortion && (
            <span className={errorClass}>{errors.architecturalDistortion}</span>
          )}
        </div>
        {/* Associated Abnormality */}
        <div className={sectionClass}>
          <label className={labelClass}>Associated Abnormality</label>
          <div className="ml-4 space-y-2">
            <div>
              <label className={labelClass + ' text-sm'}>Skin</label>
              <div className="mt-2 flex gap-6">
                {yesNoOptions.map(opt => (
                  <label
                    key={opt}
                    className={radioLabelClass}
                  >
                    <input
                      type="radio"
                      name="associatedAbnormalitySkin"
                      value={opt}
                      checked={form.associatedAbnormalitySkin === opt}
                      onChange={e => handleChange('associatedAbnormalitySkin', e.target.value)}
                      className="accent-white"
                    />
                    {opt}
                  </label>
                ))}
              </div>
              {errors.associatedAbnormalitySkin && (
                <span className={errorClass}>{errors.associatedAbnormalitySkin}</span>
              )}
            </div>
            <div>
              <label className={labelClass + ' text-sm'}>Nipple</label>
              <div className="mt-2 flex gap-6">
                {yesNoOptions.map(opt => (
                  <label
                    key={opt}
                    className={radioLabelClass}
                  >
                    <input
                      type="radio"
                      name="associatedAbnormalityNipple"
                      value={opt}
                      checked={form.associatedAbnormalityNipple === opt}
                      onChange={e => handleChange('associatedAbnormalityNipple', e.target.value)}
                      className="accent-white"
                    />
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
                {yesNoOptions.map(opt => (
                  <label
                    key={opt}
                    className={radioLabelClass}
                  >
                    <input
                      type="radio"
                      name="associatedAbnormalityLymphNode"
                      value={opt}
                      checked={form.associatedAbnormalityLymphNode === opt}
                      onChange={e => handleChange('associatedAbnormalityLymphNode', e.target.value)}
                      className="accent-white"
                    />
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
        {biRadsOptions.map(opt => (
          <label
            key={opt}
            className={radioLabelClass}
          >
            <input
              type="radio"
              name="biRads"
              value={opt}
              checked={form.biRads === opt}
              onChange={e => handleChange('biRads', e.target.value)}
              className="accent-white"
            />
            {opt}
          </label>
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
        className="w-full rounded border border-[#6B6C6E] bg-gray-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white"
        rows={3}
        placeholder="Enter remarks or notes"
        style={{ fontFamily: 'inherit', fontSize: '1rem' }}
      />
    </div>
  </>
);

export default MammographyQuestions;
