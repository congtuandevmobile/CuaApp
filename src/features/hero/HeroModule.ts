import { Module, bind } from '@magic-runtime/di';
import { SharedModule } from '@/shared/SharedModule';
import { ChangeGender } from './application/ChangeGender';
import { ChangeSkinTone } from './application/ChangeSkinTone';
import { CreateHero } from './application/CreateHero';
import { EquipAccessory } from './application/EquipAccessory';
import { GetHero } from './application/GetHero';
import { GetProgress } from './application/GetProgress';
import { SaveHero } from './application/SaveHero';
import { SyncHero } from './application/SyncHero';
import { HeroGateway, HeroRepository, ProgressSource } from './domain/ports';
import { HttpHeroGateway } from './infrastructure/HttpHeroGateway';
import { KeyValueHeroRepository } from './infrastructure/KeyValueHeroRepository';
import { StoredProgressSource } from './infrastructure/StoredProgressSource';
import { HeroController } from './presentation/HeroController';

/** Public surface for the app shell: `HeroController`. */
@Module({
  imports: [SharedModule],
  providers: [
    // The server holds the hero; the device keeps a copy for the first frame, offline use and guests.
    bind(HeroGateway).toClass(HttpHeroGateway),
    bind(HeroRepository).toClass(KeyValueHeroRepository),
    SaveHero,
    SyncHero,
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
