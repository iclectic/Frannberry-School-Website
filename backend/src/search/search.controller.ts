import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get()
  search(@Query('q') q: string, @CurrentUser() user: any) {
    return this.searchService.search(q, user?.role || '');
  }
}
