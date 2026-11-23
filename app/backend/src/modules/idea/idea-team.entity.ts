import { Entity, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@common/base.entity';
import { Node } from '../node/node.entity';
import { Team } from '../team/team.entity';

/** An idea shared (read-only) with every member of a team. */
@Index('UQ_idea_teams_idea_team', ['idea', 'team'], { unique: true })
@Entity('idea_teams')
export class IdeaTeam extends BaseEntity {
  @ManyToOne(() => Node, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'ideaId', foreignKeyConstraintName: 'FK_idea_teams_idea' })
  idea!: Node;

  @ManyToOne(() => Team, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'teamId', foreignKeyConstraintName: 'FK_idea_teams_team' })
  team!: Team;
}
