import { Module, bind } from '@magic-runtime/di';
import { SharedModule } from '@/shared/SharedModule';
import { ChangeGender } from './application/ChangeGender';
import { ChangeSkinTone } from './application/ChangeSkinTone';
import { CreateHero } from './application/CreateHero';
import { EquipAccessory } from './application/EquipAccessory';
import { GetHero } from './application/GetHero';
import { GetProgress } from './application/GetProgress';
import { HeroRepository, ProgressSource } from './domain/ports';
import { KeyValueHeroRepository } from './infrastructure/KeyValueHeroRepository';
import { StoredProgressSource } from './infrastructure/StoredProgressSource';
import { HeroController } from './presentation/HeroController';

/** Public surface for the app shell: `HeroController`. */
@Module({
  imports: [SharedModule],
  providers: [
    bind(HeroRepository).toClass(KeyValueHeroRepository),
    bind(ProgressSource).toClass(StoredProgressSource),
    CreateHero,
    GetHero,
    GetProgress,
    ChangeGender,
    ChangeSkinTone,
    EquipAccessory,
    HeroController,
  ],
})
export class HeroModule {}
