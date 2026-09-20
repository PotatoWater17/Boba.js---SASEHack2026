"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FilterSelect } from "@/filter-select";
import { GROUP_KINDS, MEETUP_STYLES, searchCourses } from "@/courses";
import { MEETING_FORMAT_FILTERS } from "@/meeting-format";
import { searchUniversities, UNIVERSITIES } from "@/universities";

export function BrowseFilters({
  defaultUni = "",
  defaultSubject = "",
  defaultKind = "",
  defaultStyle = "",
  defaultFormat = "",
  defaultOnlyMine = false,
  showAllSchoolsLink = false,
  allSchoolsHref = "/find/browse?uni=all",
  showClear = false,
  clearHref = "/find/browse",
}: {
  defaultUni?: string;
  defaultSubject?: string;
  defaultKind?: string;
  defaultStyle?: string;
  defaultFormat?: string;
  defaultOnlyMine?: boolean;
  showAllSchoolsLink?: boolean;
  allSchoolsHref?: string;
  showClear?: boolean;
  clearHref?: string;
}) {
  const [uni, setUni] = useState(defaultUni);
  const [uniOpen, setUniOpen] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [subjectOpen, setSubjectOpen] = useState(false);

  const uniTrimmed = uni.trim();
  const uniMatches = useMemo(() => {
    if (!uniTrimmed) return UNIVERSITIES.slice(0, 12);
    return searchUniversities(uniTrimmed, 16);
  }, [uniTrimmed]);

  const subjectMatches = useMemo(() => searchCourses(subject, 16), [subject]);

  function pickUni(value: string) {
    setUni(value);
    setUniOpen(false);
  }

  function pickSubject(value: string) {
    setSubject(value);
    setSubjectOpen(false);
  }

  return (
    <form method="get" className="browse-filters">
      <div className="browse-filters-grid">
        <div className="filter-field">
          <label className="filter-field-label" htmlFor="browse-uni">
            School
          </label>
          <div className="filter-combobox">
            <input
              id="browse-uni"
              className="filter-combobox-input"
              name="uni"
              value={uni}
              placeholder="All schools"
              autoComplete="off"
              onFocus={() => setUniOpen(true)}
              onChange={(e) => {
                setUni(e.target.value);
                setUniOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && uniMatches[0]) {
                  e.preventDefault();
                  pickUni(uniMatches[0]);
                }
              }}
              onBlur={() => setTimeout(() => setUniOpen(false), 150)}
            />
            {uniOpen && uniMatches.length ? (
              <div className="filter-select-menu filter-combobox-menu">
                {uniMatches.map((u) => (
                  <button
                    key={u}
                    type="button"
                    className="filter-select-option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickUni(u)}
                  >
                    <span>{u}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="filter-field">
          <label className="filter-field-label" htmlFor="browse-subject">
            Subject
          </label>
          <div className="filter-combobox">
            <input
              id="browse-subject"
              className="filter-combobox-input"
              name="subject"
              value={subject}
              placeholder="All subjects"
              autoComplete="off"
              maxLength={80}
              onFocus={() => setSubjectOpen(true)}
              onChange={(e) => {
                setSubject(e.target.value);
                setSubjectOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && subjectMatches[0]) {
                  e.preventDefault();
                  pickSubject(subjectMatches[0]);
                }
              }}
              onBlur={() => setTimeout(() => setSubjectOpen(false), 150)}
            />
            {subjectOpen && subjectMatches.length ? (
              <div className="filter-select-menu filter-combobox-menu">
                {subjectMatches.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="filter-select-option"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSubject(c)}
                  >
                    <span>{c}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <FilterSelect
          name="kind"
          label="Group size"
          defaultValue={defaultKind}
          placeholder="Any group size"
          options={GROUP_KINDS.map((k) => ({ value: k.id, label: k.label }))}
        />

        <FilterSelect
          name="style"
          label="Study style"
          defaultValue={defaultStyle}
          placeholder="Any style"
          options={MEETUP_STYLES.map((s) => ({ value: s, label: s }))}
        />

        <FilterSelect
          name="format"
          label="Format"
          defaultValue={defaultFormat}
          placeholder="Any format"
          options={MEETING_FORMAT_FILTERS.map((f) => ({ value: f.value, label: f.label }))}
        />
      </div>

      <div className="browse-filters-foot">
        <label className="browse-filter-check">
          <input type="checkbox" name="mine" value="1" defaultChecked={defaultOnlyMine} />
          <span>Only my preferred classes</span>
        </label>
        <div className="browse-filters-actions">
          <button className="btn" type="submit">
            Apply filters
          </button>
          {showAllSchoolsLink ? (
            <Link className="btn btn-ghost" href={allSchoolsHref}>
              All schools
            </Link>
          ) : null}
          {showClear ? (
            <Link className="btn btn-ghost" href={clearHref}>
              Clear
            </Link>
          ) : null}
        </div>
      </div>
    </form>
  );
}
