import React from 'react';

const fgtOptions = ['A', 'B', 'C', 'D'];
const bpeOptions = ['Mild', 'Minimal', 'Moderate', 'Marked'];
const definitionOptions = ['Normal', 'Abnormal'];
const massOptions = ['Begin', 'Suspicpius'];
const nmeOptions = ['Begin', 'Suspicpius'];
const yesNoOptions = ['Yes', 'No'];
const biRadsOptions = ['0', '1 or 2', '4 or 5'];

const labelClass = 'block mb-1 text-base font-semibold text-white font-sans tracking-wide';
const radioLabelClass = 'flex items-center gap-2 text-sm font-medium text-gray-200 font-sans';
const selectClass =
  'w-full rounded border border-[#6B6C6E] bg-gray-900 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white';
const errorClass = 'text-xs text-red-400 mt-1 font-sans';
const sectionClass = 'mb-4';

export interface MRIQuestionProps {
  form: any;
  errors: { [key: string]: string };
  handleChange: (field: string, value: string) => void;
}

const MRIQuestion: React.FC<MRIQuestionProps> = ({ form, errors, handleChange }) => (
  <>
    {/* Amount of FGT */}
    <div className={sectionClass}>
      <label className={labelClass}>Amount of FGT</label>
      <div className="mt-2 flex gap-6">
        {fgtOptions.map(opt => (
          <label
            key={opt}
            className={radioLabelClass}
          >
            <input
              type="radio"
              name="fgt"
              value={opt}
              checked={form.fgt === opt}
              onChange={e => handleChange('fgt', e.target.value)}
              className="accent-white"
            />
            {opt}
          </label>
        ))}
      </div>
      {errors.fgt && <span className={errorClass}>{errors.fgt}</span>}
    </div>

    {/* BPE */}
    <div className={sectionClass}>
      <label className={labelClass}>BPE</label>
      <div className="mt-2 flex gap-6">
        {bpeOptions.map(opt => (
          <label
            key={opt}
            className={radioLabelClass}
          >
            <input
              type="radio"
              name="bpe"
              value={opt}
              checked={form.bpe === opt}
              onChange={e => handleChange('bpe', e.target.value)}
              className="accent-white"
            />
            {opt}
          </label>
        ))}
      </div>
      {errors.bpe && <span className={errorClass}>{errors.bpe}</span>}
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

    {/* Conditional fields if Abnormal */}
    {form.definition === 'Abnormal' && (
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
        {/* NME */}
        <div className={sectionClass}>
          <label className={labelClass}>NME</label>
          <select
            value={form.nme}
            onChange={e => handleChange('nme', e.target.value)}
            className={selectClass}
          >
            <option value="">Select</option>
            {nmeOptions.map(opt => (
              <option
                key={opt}
                value={opt}
              >
                {opt}
              </option>
            ))}
          </select>
          {errors.nme && <span className={errorClass}>{errors.nme}</span>}
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
            <div>
              <label className={labelClass + ' text-sm'}>Chest Wall</label>
              <div className="mt-2 flex gap-6">
                {yesNoOptions.map(opt => (
                  <label
                    key={opt}
                    className={radioLabelClass}
                  >
                    <input
                      type="radio"
                      name="associatedAbnormalityChestWall"
                      value={opt}
                      checked={form.associatedAbnormalityChestWall === opt}
                      onChange={e => handleChange('associatedAbnormalityChestWall', e.target.value)}
                      className="accent-white"
                    />
                    {opt}
                  </label>
                ))}
              </div>
              {errors.associatedAbnormalityChestWall && (
                <span className={errorClass}>{errors.associatedAbnormalityChestWall}</span>
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

export default MRIQuestion;
