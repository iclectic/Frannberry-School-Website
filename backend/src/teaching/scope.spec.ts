import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  collapsePlacements,
  groupByPlacement,
  matchesPlacement,
  Placement,
  recordsForPlacement,
  trustWideItems,
} from './scope';

const nursery: Placement = {
  pupilId: 'poppy',
  pupilName: 'Poppy Smith',
  schoolId: 'sch-n',
  schoolName: 'Nursery',
  phase: 'NURSERY',
  keyStage: 'EYFS',
  classId: 'c-n',
  className: 'Nursery',
};
const year3: Placement = {
  pupilId: 'isla',
  pupilName: 'Isla Smith',
  schoolId: 'sch-p',
  schoolName: 'Primary',
  phase: 'PRIMARY',
  keyStage: 'KS2',
  classId: 'c-3',
  className: 'Year 3',
};
const reception: Placement = {
  pupilId: null,
  pupilName: null,
  schoolId: 'sch-p',
  schoolName: 'Primary',
  phase: 'PRIMARY',
  keyStage: 'EYFS',
  classId: 'c-r',
  className: 'Reception',
};
const year7a: Placement = {
  pupilId: 'oliver',
  pupilName: 'Oliver Smith',
  schoolId: 'sch-s',
  schoolName: 'Secondary',
  phase: 'SECONDARY',
  keyStage: 'KS3',
  classId: 'c-7a',
  className: 'Year 7A',
};
const year7b: Placement = {
  ...year7a,
  pupilId: 'liam',
  pupilName: 'Liam Brown',
  classId: 'c-7b',
  className: 'Year 7B',
};
const ks4: Placement = {
  pupilId: 'older',
  pupilName: 'Older Pupil',
  schoolId: 'sch-s',
  schoolName: 'Secondary',
  phase: 'SECONDARY',
  keyStage: 'KS4',
  classId: 'c-10',
  className: 'Year 10',
};

const year7Announcement = { id: 'a-7', schoolId: 'sch-s', keyStage: 'KS3', classId: 'c-7a' };
const year3Announcement = { id: 'a-3', schoolId: 'sch-p', keyStage: 'KS2', classId: 'c-3' };
const nurseryAnnouncement = { id: 'a-n', schoolId: 'sch-n', keyStage: 'EYFS', classId: 'c-n' };
const secondarySchool = { id: 'a-s', schoolId: 'sch-s', keyStage: null, classId: null };
const trustEvening = { id: 'a-t', schoolId: null, keyStage: null, classId: null };

test('a class announcement stays inside that school and key stage', () => {
  assert.equal(matchesPlacement(year7Announcement, year7a, 'stage'), true);
  assert.equal(matchesPlacement(year7Announcement, year7b, 'stage'), true);
  assert.equal(matchesPlacement(year7Announcement, ks4, 'stage'), false);
  assert.equal(matchesPlacement(year7Announcement, year3, 'stage'), false);
  assert.equal(matchesPlacement(year7Announcement, nursery, 'stage'), false);
  assert.equal(matchesPlacement(year7Announcement, reception, 'stage'), false);
});

test('a school announcement stays inside that school, and a trust announcement is visible everywhere', () => {
  assert.equal(matchesPlacement(secondarySchool, year7a, 'stage'), true);
  assert.equal(matchesPlacement(secondarySchool, ks4, 'stage'), true);
  assert.equal(matchesPlacement(secondarySchool, nursery, 'stage'), false);
  assert.equal(matchesPlacement(secondarySchool, year3, 'stage'), false);
  assert.equal(matchesPlacement(trustEvening, nursery, 'stage'), true);
  assert.deepEqual(trustWideItems([year7Announcement, trustEvening]).map((item) => item.id), ['a-t']);
});

test('attendance, the timetable, and report cards stay on the pupil’s own class', () => {
  const oliverSlot = { schoolId: 'sch-s', keyStage: 'KS3', classId: 'c-7a' };
  const liamSlot = { schoolId: 'sch-s', keyStage: 'KS3', classId: 'c-7b' };
  const wrongClass = { schoolId: 'sch-p', keyStage: 'KS2', classId: 'c-3' };
  assert.deepEqual(
    recordsForPlacement([oliverSlot, liamSlot, wrongClass], year7a, 'class'),
    [oliverSlot],
  );
  assert.equal(matchesPlacement(oliverSlot, year7b, 'class'), false);
  assert.equal(matchesPlacement(year3Announcement, reception, 'class'), false);
});

test('a parent sees each child’s records in that child’s school and key stage', () => {
  const announcements = [year7Announcement, year3Announcement, nurseryAnnouncement, secondarySchool, trustEvening];
  const grouped = groupByPlacement(announcements, [nursery, year3, year7a], 'stage');
  assert.deepEqual(grouped.map((group) => group.placement.pupilName), ['Poppy Smith', 'Isla Smith', 'Oliver Smith']);
  assert.deepEqual(grouped[0].items.map((item) => item.id), ['a-n']);
  assert.deepEqual(grouped[1].items.map((item) => item.id), ['a-3']);
  assert.deepEqual(grouped[2].items.map((item) => item.id), ['a-7', 'a-s']);
});

test('sibling classes in one key stage share one announcement group', () => {
  const headClasses: Placement[] = [
    { ...year7a, pupilId: null, pupilName: null },
    { ...year7b, pupilId: null, pupilName: null },
  ];
  const collapsed = collapsePlacements(headClasses);
  assert.equal(collapsed.length, 1);
  assert.equal(collapsed[0].keyStage, 'KS3');
  assert.equal(collapsed[0].classId, null);
  const grouped = groupByPlacement([year7Announcement, nurseryAnnouncement], headClasses, 'stage');
  assert.equal(grouped.length, 1);
  assert.deepEqual(grouped[0].items.map((item) => item.id), ['a-7']);
});
