import { module } from 'inversiland';
import { SharedModule } from '@/shared/SharedModule';
import { ChangeGender } from './application/ChangeGender';
import { ChangeSkinTone } from './application/ChangeSkinTone';
import { CreateHero } from './application/CreateHero';
import { EquipAccessory } from './application/EquipAccessory';
import { GetHero } from './application/GetHero';
import { GetProgress } from './application/GetProgress';
import { HeroRepositoryToken, ProgressSourceToken } from './domain/ports';
import { KeyValueHeroRepository } from './infrastructure/KeyValueHeroRepository';
import { StoredProgressSource } from './infrastructure/StoredProgressSource';
import { HeroController } from './presentation/HeroController';

@module({
  imports: [SharedModule],
  providers: [
    { provide: HeroRepositoryToken, useClass: KeyValueHeroRepository },
    { provide: ProgressSourceToken, useClass: StoredProgressSource },
    CreateHero,
    GetHero,
    GetProgress,
    ChangeGender,
    ChangeSkinTone,
    EquipAccessory,
    HeroController,
  ],
  exports: [HeroController],
})
export class HeroModule {}
