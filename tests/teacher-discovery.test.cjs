const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function harness() {
  let params = new URLSearchParams('view=teachers');
  let result = { data: [], isPending: false, error: null, refetch() {} };
  let destination;
  const imports = {
    'next/link': { default: props => React.createElement('a', props) },
    'next/navigation': { useRouter: () => ({ push: url => { destination = url; } }), useSearchParams: () => params },
    '@tanstack/react-query': { useQuery: () => result },
    '@/lib/queries/teachers': { listTeachers() {} },
    '@/components/shared/LearningImage': { TeacherImage: () => null },
    './LessonDiscovery': { LessonDiscovery: () => React.createElement('p', null, '수업 목록') },
  };
  const context = { exports: {}, URLSearchParams, FormData: class { constructor(form) { this.form = form; } get(key) { return this.form[key]; } }, require: name => imports[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/features/TeacherDiscovery.tsx', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context);
  return {
    ...context.exports,
    setParams: value => { params = new URLSearchParams(value); },
    setResult: value => { result = { ...result, ...value }; },
    destination: () => destination,
  };
}
const teacher = { id: 'teacher-1', name: '하나', headline: '함께 배우는 한국어', ratingAvg: 4.8, ratingCount: 2, specialties: ['여행'], lessonTitles: ['카페 회화'] };

test('search keeps lessons and provides a teacher list with profile links', () => {
  const h = harness();
  h.setParams('');
  assert.match(renderToStaticMarkup(React.createElement(h.SearchDiscovery)), /수업 목록/);
  h.setParams('view=teachers');
  h.setResult({ data: [teacher] });
  const markup = renderToStaticMarkup(React.createElement(h.SearchDiscovery));
  assert.match(markup, /1명의 선생님/);
  assert.match(markup, /href="\/teachers\/teacher-1"/);
  assert.doesNotMatch(markup, /수업 목록/);
});

test('teacher search supports name, specialty and lesson title from the URL', () => {
  const h = harness();
  h.setResult({ data: [teacher] });
  for (const q of ['하나', '여행', '카페', '']) {
    h.setParams(`view=teachers&q=${q}`);
    assert.match(renderToStaticMarkup(React.createElement(h.TeacherDiscovery)), /1명의 선생님/);
  }
  h.setParams('view=teachers&q=일치하지않음');
  assert.match(renderToStaticMarkup(React.createElement(h.TeacherDiscovery)), /검색 조건에 맞는 선생님이 없습니다/);
  const form = h.TeacherDiscovery().props.children[0].props.children[2];
  form.props.onSubmit({ preventDefault() {}, currentTarget: { q: ' 하나 ' } });
  const url = new URL(h.destination(), 'https://example.test');
  assert.equal(url.searchParams.get('view'), 'teachers');
  assert.equal(url.searchParams.get('q'), '하나');
});

test('loading and failures do not appear as an empty teacher list; retry is available', () => {
  const h = harness();
  h.setResult({ isPending: true });
  let markup = renderToStaticMarkup(React.createElement(h.TeacherDiscovery));
  assert.match(markup, /불러오고 있어요/);
  assert.doesNotMatch(markup, /아직 없습니다/);
  h.setResult({ isPending: false, error: new Error('unavailable') });
  markup = renderToStaticMarkup(React.createElement(h.TeacherDiscovery));
  assert.match(markup, /role="alert"/);
  assert.match(markup, /다시 시도/);
  assert.doesNotMatch(markup, /아직 없습니다/);
  h.setResult({ error: null });
  assert.match(renderToStaticMarkup(React.createElement(h.TeacherDiscovery)), /등록된 선생님이 아직 없습니다/);
});
