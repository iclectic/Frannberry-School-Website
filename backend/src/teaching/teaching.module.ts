import { Global, Module } from '@nestjs/common';
import { TeachingScopeService } from './teaching-scope.service';

@Global()
@Module({
  providers: [TeachingScopeService],
  exports: [TeachingScopeService],
})
export class TeachingModule {}
