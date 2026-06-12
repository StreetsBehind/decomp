// Monolithic (large-chunk) rung of the task-size axis: the SAME three concerns as the atomic tasks,
// but built in ONE generation. The oracle is the exact UNION of the three atomic tasks' tests, run
// against the single module — so atomic-vs-mono is a clean granularity contrast on identical work.
import * as updateProfile from '../update-profile/tests.mjs';
import * as listProjects from '../list-projects/tests.mjs';
import * as postComment from '../post-comment/tests.mjs';

export const happy = [...updateProfile.happy, ...listProjects.happy, ...postComment.happy];
export const obligation = [...updateProfile.obligation, ...listProjects.obligation, ...postComment.obligation];
