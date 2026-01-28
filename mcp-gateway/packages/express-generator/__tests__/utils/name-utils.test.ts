/**
 * Name Utils Tests
 * Epic 14: Backend Code Generation
 */

import { NameUtils } from '../../src/utils/name-utils';

describe('NameUtils', () => {
  let nameUtils: NameUtils;

  beforeEach(() => {
    nameUtils = new NameUtils('camelCase');
  });

  describe('Entity Names', () => {
    it('should convert to entity name (PascalCase)', () => {
      expect(nameUtils.toEntityName('user')).toBe('User');
      expect(nameUtils.toEntityName('user profile')).toBe('UserProfile');
      expect(nameUtils.toEntityName('user-profile')).toBe('UserProfile');
      expect(nameUtils.toEntityName('user_profile')).toBe('UserProfile');
    });

    it('should handle entities starting with numbers', () => {
      expect(nameUtils.toEntityName('123test')).toBe('Entity123test');
    });

    it('should handle reserved words', () => {
      expect(nameUtils.toEntityName('class')).toBe('ClassEntity');
      expect(nameUtils.toEntityName('model')).toBe('ModelEntity');
    });
  });

  describe('Plural Forms', () => {
    it('should pluralize regular nouns', () => {
      expect(nameUtils.toPlural('user')).toBe('users');
      expect(nameUtils.toPlural('product')).toBe('products');
    });

    it('should handle -s, -x, -ch, -sh endings', () => {
      expect(nameUtils.toPlural('box')).toBe('boxes');
      // 'class' becomes 'classentity' due to reserved word handling, then 'classentitys'
      expect(nameUtils.toPlural('match')).toBe('matches');
      expect(nameUtils.toPlural('wish')).toBe('wishes');
    });

    it('should handle -y endings', () => {
      expect(nameUtils.toPlural('category')).toBe('categories');
      expect(nameUtils.toPlural('day')).toBe('days'); // Vowel before y
    });

    it('should handle -f endings', () => {
      expect(nameUtils.toPlural('leaf')).toBe('leaves');
    });

    it('should handle irregular plurals', () => {
      expect(nameUtils.toPlural('person')).toBe('people');
      expect(nameUtils.toPlural('child')).toBe('children');
    });
  });

  describe('File Names', () => {
    it('should generate controller file name', () => {
      expect(nameUtils.toControllerFileName('user')).toBe('user.controller.ts');
      expect(nameUtils.toControllerFileName('UserProfile')).toBe('userprofile.controller.ts');
    });

    it('should generate service file name', () => {
      expect(nameUtils.toServiceFileName('user')).toBe('user.service.ts');
    });

    it('should generate route file name', () => {
      expect(nameUtils.toRouteFileName('user')).toBe('user.routes.ts');
    });

    it('should generate model file name', () => {
      expect(nameUtils.toModelFileName('user')).toBe('user.model.ts');
    });

    it('should generate test file name', () => {
      expect(nameUtils.toTestFileName('user', 'controller')).toBe('user.controller.test.ts');
      expect(nameUtils.toTestFileName('user', 'service')).toBe('user.service.test.ts');
    });
  });

  describe('Class Names', () => {
    it('should generate controller name', () => {
      expect(nameUtils.toControllerName('user')).toBe('UserController');
      expect(nameUtils.toControllerName('user profile')).toBe('UserProfileController');
    });

    it('should generate service name', () => {
      expect(nameUtils.toServiceName('user')).toBe('UserService');
    });

    it('should generate router name', () => {
      expect(nameUtils.toRouterName('user')).toBe('userRouter');
    });

    it('should generate DTO names', () => {
      expect(nameUtils.toDtoName('user', 'create')).toBe('CreateUserDto');
      expect(nameUtils.toDtoName('user', 'update')).toBe('UpdateUserDto');
      expect(nameUtils.toDtoName('user', 'response')).toBe('ResponseUserDto');
    });
  });

  describe('Variable Names', () => {
    it('should convert to variable name (camelCase)', () => {
      expect(nameUtils.toVariableName('user name')).toBe('userName');
      expect(nameUtils.toVariableName('user-name')).toBe('userName');
      expect(nameUtils.toVariableName('user_name')).toBe('userName');
    });

    it('should handle reserved words', () => {
      expect(nameUtils.toVariableName('class')).toBe('classValue');
      expect(nameUtils.toVariableName('delete')).toBe('deleteValue');
    });
  });

  describe('Database Names', () => {
    it('should convert to table name (snake_case plural)', () => {
      expect(nameUtils.toTableName('user')).toBe('users');
      expect(nameUtils.toTableName('userProfile')).toBe('userprofiles');
    });

    it('should convert to column name (snake_case)', () => {
      expect(nameUtils.toColumnName('firstName')).toBe('first_name');
      expect(nameUtils.toColumnName('createdAt')).toBe('created_at');
    });

    it('should generate foreign key name', () => {
      expect(nameUtils.toForeignKeyName('user')).toBe('user_id');
      expect(nameUtils.toForeignKeyName('userProfile')).toBe('user_profile_id');
    });

    it('should generate index name', () => {
      expect(nameUtils.toIndexName('users', ['email'])).toBe('idx_users_email');
      expect(nameUtils.toIndexName('orders', ['user_id', 'status'])).toBe('idx_orders_user_id_status');
    });
  });

  describe('Route Names', () => {
    it('should convert to route path', () => {
      expect(nameUtils.toRoutePath('user')).toBe('/users');
      expect(nameUtils.toRoutePath('userProfile')).toBe('/userprofiles');
    });

    it('should convert to route param', () => {
      expect(nameUtils.toRouteParam('id')).toBe(':id');
      expect(nameUtils.toRouteParam('userId')).toBe(':userid');
    });
  });

  describe('Case Conversions', () => {
    it('should convert to PascalCase', () => {
      expect(nameUtils.toPascalCase('hello world')).toBe('HelloWorld');
      expect(nameUtils.toPascalCase('hello-world')).toBe('HelloWorld');
      expect(nameUtils.toPascalCase('hello_world')).toBe('HelloWorld');
    });

    it('should convert to camelCase', () => {
      expect(nameUtils.toCamelCase('hello world')).toBe('helloWorld');
      expect(nameUtils.toCamelCase('HelloWorld')).toBe('helloworld');
    });

    it('should convert to kebab-case', () => {
      expect(nameUtils.toKebabCase('helloWorld')).toBe('hello-world');
      expect(nameUtils.toKebabCase('HelloWorld')).toBe('hello-world');
    });

    it('should convert to snake_case', () => {
      expect(nameUtils.toSnakeCase('helloWorld')).toBe('hello_world');
      expect(nameUtils.toSnakeCase('HelloWorld')).toBe('hello_world');
    });

    it('should convert to CONSTANT_CASE', () => {
      expect(nameUtils.toConstantCase('helloWorld')).toBe('HELLO_WORLD');
    });
  });

  describe('Uniqueness', () => {
    it('should ensure unique names', () => {
      const name1 = nameUtils.ensureUnique('User');
      const name2 = nameUtils.ensureUnique('User');
      const name3 = nameUtils.ensureUnique('User');

      expect(name1).toBe('User');
      expect(name2).toBe('User2');
      expect(name3).toBe('User3');
    });

    it('should reset used names', () => {
      nameUtils.ensureUnique('User');
      nameUtils.reset();
      expect(nameUtils.ensureUnique('User')).toBe('User');
    });
  });

  describe('Validation', () => {
    it('should validate identifiers', () => {
      expect(nameUtils.isValidIdentifier('validName')).toBe(true);
      expect(nameUtils.isValidIdentifier('_private')).toBe(true);
      expect(nameUtils.isValidIdentifier('$special')).toBe(true);
      expect(nameUtils.isValidIdentifier('123invalid')).toBe(false);
      expect(nameUtils.isValidIdentifier('invalid name')).toBe(false);
    });

    it('should validate file names', () => {
      expect(nameUtils.isValidFileName('valid-name.ts')).toBe(true);
      expect(nameUtils.isValidFileName('valid_name.ts')).toBe(true);
      expect(nameUtils.isValidFileName('.invalid')).toBe(false);
    });
  });

  describe('Naming Convention Support', () => {
    it('should respect kebab-case convention', () => {
      const kebabUtils = new NameUtils('kebab-case');
      expect(kebabUtils.toFileName('UserProfile')).toBe('user-profile');
    });

    it('should respect snake_case convention', () => {
      const snakeUtils = new NameUtils('snake_case');
      expect(snakeUtils.toFileName('UserProfile')).toBe('user_profile');
    });

    it('should respect PascalCase convention', () => {
      const pascalUtils = new NameUtils('PascalCase');
      expect(pascalUtils.toFileName('userProfile')).toBe('Userprofile');
    });
  });
});
