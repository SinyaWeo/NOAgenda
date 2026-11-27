import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, Min } from 'class-validator';
import { MAX_PAGE_SIZE } from '../../node/dto/node.dto';

/** `?taskIds=1,2,3`: the tasks a view shows (Gantt chart, mind map). Larger views ask in chunks. */
export class DependenciesQueryDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').map((v) => (v.trim() === '' ? NaN : Number(v))) : value,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_PAGE_SIZE)
  @IsInt({ each: true })
  @Min(1, { each: true })
  taskIds!: number[];
}
