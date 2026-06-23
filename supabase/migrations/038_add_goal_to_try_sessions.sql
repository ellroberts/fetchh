alter table try_sessions add column goal text;
alter table try_sessions alter column email drop not null;
alter table try_sessions alter column niche drop not null;
alter table try_sessions alter column email set default null;
alter table try_sessions alter column niche set default null;
